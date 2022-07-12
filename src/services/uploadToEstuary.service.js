const express = require("express");
const axios = require("axios");
const fs = require("fs");
const fse = require("fs-extra");
const FormData = require("form-data");
const web3 = require("web3");
const { ethers } = require("ethers");
const mongodb = require("mongodb");
const validate = require("bids-validator");
const { packToFs } = require("ipfs-car/pack/fs");
const { FsBlockStore } = require("ipfs-car/blockstore/fs");
const { msgCache } = require("../init");
const dbWrapper = require("../utils/dbWrapper");
const estuaryWrapper = require("../utils/estuaryWrapper");
const utils = require("../utils/utils");

const runBidsValidation = async (pathToDirectory) => {
  return new Promise((resolve) => {
    // const dirName = values.files[0].webkitRelativePath.split('/')[1]
    // const defaultConfig = `${dirName}/.bids-validator-config.json`
    let valid = false;
    validate.default.BIDS(
      pathToDirectory,
      {
        verbose: true,
        ignoreWarnings: true,
        ignoreNiftiHeaders: true,
        ignoreSubjectConsistency: true,
        // config: defaultConfig
      },
      (issues, summary) => {
        if (issues.errors.length > 0) {
          console.log("BIDS validation failed");
          console.log(issues);
          resolve(false);
        } else {
          // console.log("BIDS validation succeeded");
          resolve(true);
        }
      }
    );
  });
};

// Validate input for uploadFile()
const runInitialInputValidation = async (req) => {
  if (!req.body.address || !req.files || !req.body.signature) {
    console.log("Missing argument");
    await utils.removeFiles(req.files[0].destination);
    return false;
  }
  if (req.body.address.length != 42 || req.body.address.substring(0, 2) != "0x") {
    console.log("Invalid address");
    await utils.removeFiles(req.files[0].destination);
    return false;
  }
  const address = req.body.address.toLowerCase();
  const secretMessage = msgCache.take(address);
  if (!secretMessage) {
    console.log(`No secret message for ${address} at time ${Date.now()}`);
    await utils.removeFiles(req.files[0].destination);
    return false;
  }
  const msgHash = web3.utils.sha3(secretMessage);
  const signer = (await ethers.utils.recoverAddress(msgHash, req.body.signature)).toLowerCase();
  if (signer != address) {
    console.log("signer != address");
    console.log(`signer:  ${signer}`);
    console.log(`address: ${address}`);
    await utils.removeFiles(req.files[0].destination);
    return false;
  }

  // Check that user has Holo
  try {
    const resp = await axios.get("https://sciverse.id/api/getAllUserAddresses");
    const holoAddresses = resp.data;
    if (!holoAddresses.includes(address)) {
      console.log("User is not authorized to upload. They do not have a Holo.");
      await utils.removeFiles(req.files[0].destination);
      return false;
    }
  } catch (err) {
    console.log("User is not authorized to upload. They do not have a Holo.");
    console.log(err);
    await utils.removeFiles(req.files[0].destination);
    return false;
  }

  return true;
};

// Move uploaded files into the folders that the user had them in.
// E.g., if user uploaded /testdir/abc.txt, move the local file abc.txt to <tmpFolder>/testdir/abc.txt
const moveFilesToCorrectFolders = async (req) => {
  const files = [];
  const timestampedFolder = req.files[0].destination;
  for (const file of req.files) {
    if (typeof req.body[file.originalname] != "string") {
      console.log("error: typeof req.body[file.originalname] != string");
      return false;
    }
    const userDefinedPath = req.body[file.originalname].startsWith("/")
      ? req.body[file.originalname].substring(1)
      : req.body[file.originalname];
    if (!userDefinedPath.includes("/")) {
      continue;
    }
    const newLocalFilePath = timestampedFolder + "/" + userDefinedPath;
    file.currentLocalFilePath = file.path;
    file.localFilePath = newLocalFilePath;
    file.userDefinedPath = userDefinedPath;
    file.name = file.originalname; // For new metadata
    file.path = userDefinedPath; // For new metadata
    file.documentation = ""; // For new metadata
    files.push(file);

    try {
      await fse.move(file.currentLocalFilePath, newLocalFilePath);
    } catch (err) {
      console.log(err);
      return [];
    }
  }
  return files;
};

const generateCommonsFile = (file, chunkId) => {
  return {
    _id: mongodb.ObjectId(),
    chunkId: chunkId,
    name: file.name,
    path: file.path,
    size: file.size,
    documentation: "",
  };
};

/**
 * @param params Object containing every value to store in the dataset object,
 *        except "_id" and "published" which are populated by this function.
 */
const generateDataset = (params) => {
  return {
    _id: mongodb.ObjectId(),
    title: params.title,
    description: params.description, // TODO: Extract from dataset_description.json if it exists
    authors: params.authors || [], // TODO: Extract from dataset_description.json if it exists
    uploader: params.uploader,
    license: params.license, // TODO: Extract from dataset_description.json if it exists
    doi: params.doi, // TODO: Extract from dataset_description.json if it exists
    keywords: params.keywords || [], // TODO: Extract from dataset_description.json if it exists
    published: false,
    size: params.size, // sumFileSizes,
    standard: {
      bids: {
        validated: params.bids?.validated || true,
        version: params.bids?.version || "1.9.3",
        // TODO: Fill in the rest of this
      },
    },
    chunkIds: params.chunkIds || [],
  };
};

const generateChunk = (params) => {
  return {
    _id: mongodb.ObjectId(),
    datasetId: params.datasetId,
    path: params.path || "/",
    doi: params.doi || "",
    storageIds: { cid: params.storageIds?.cid || "", estuaryId: params.storageIds?.estuaryId || null },
    fileIds: params.fileIds || [],
    size: params.size,
  };
};

/**
 * Insert dataset metadata, chunk metadata, and file(s) metadata into database.
 * @param datasetMetadata
 * @param chunkMetadata
 * @param files File objects containing metadata (e.g., name, path, chunkId)
 * @returns True if all db requests were acknowledged, false otherwise
 */
const insertMetadata = async (datasetMetadata, chunkMetadata, files) => {
  let acknowledged, dataset, chunk;
  // Max insert attempts. Try inserting multiple time in case of _id collision or other errors
  const maxAttempts = 3;

  // Dataset
  for (let numAttempts = 0; numAttempts < maxAttempts; numAttempts++) {
    dataset = generateDataset({
      title: datasetMetadata.title,
      uploader: datasetMetadata.uploader,
      size: datasetMetadata.size,
    });
    acknowledged = await dbWrapper.insertDataset(dataset);
    if (acknowledged) break;
  }
  if (!acknowledged) {
    console.log("Request to insert dataset metadata was not acknowledged by database. Exiting.");
    return false;
  }

  // Chunk
  for (let numAttempts = 0; numAttempts < maxAttempts; numAttempts++) {
    chunk = generateChunk({
      datasetId: dataset._id,
      storageIds: chunkMetadata.storageIds,
      size: chunkMetadata.size,
    });
    acknowledged = await dbWrapper.insertChunk(chunk);
    if (acknowledged) break;
  }
  if (!acknowledged) {
    console.log("Request to insert chunk metadata was not acknowledged by database. Exiting.");
    await dbWrapper.deleteDataset({ _id: dataset._id });
    return false;
  }
  await dbWrapper.updateDataset({ _id: dataset._id }, { $set: { chunkIds: [chunk._id] } });

  // commonsFiles
  const fileIds = [];
  for (const tmpFile of files) {
    let commonsFile;
    for (let numAttempts = 0; numAttempts < maxAttempts; numAttempts++) {
      commonsFile = generateCommonsFile(tmpFile, chunk._id);
      acknowledged = await dbWrapper.insertCommonsFile(commonsFile);
      if (acknowledged) break;
    }
    if (!acknowledged) {
      console.log("Request to insert commonsFile metadata was not acknowledged by database. Exiting.");
      await dbWrapper.deleteDataset({ _id: dataset._id });
      await dbWrapper.deleteChunk({ _id: chunk._id });
      await dbWrapper.deleteCommonsFiles({ _id: { $in: fileIds } });
      return false;
    }
    fileIds.push(commonsFile._id);
  }
  const queryFilter = { _id: chunk._id };
  const updateDocument = { $set: { fileIds: fileIds } };
  const updateSuccess = await dbWrapper.updateChunk(queryFilter, updateDocument);
  if (!updateSuccess) {
    await dbWrapper.deleteDataset({ _id: dataset._id });
    await dbWrapper.deleteChunk({ _id: chunk._id });
    await dbWrapper.deleteCommonsFiles({ _id: { $in: fileIds } });
    console.log("Failed to set chunk.files in database. Exiting.");
  }
  return updateSuccess;
};

const uploadFiles = async (req) => {
  // TODO: chunking

  console.log("uploadFile: Entered");
  if (!(await runInitialInputValidation(req))) return false;
  // console.log(req.files);

  const address = req.body.address.toLowerCase();
  const path = req.body.path; // path of uploaded folder from root (this is used by the frontend)

  const files = await moveFilesToCorrectFolders(req);
  if (files.length == 0) {
    console.log("uploadFiles: Files could not be organized into their proper directories");
    await utils.removeFiles(req.files[0].destination);
    return false;
  }

  const timestampedFolder = req.files[0].destination;
  const dirChildren = fs.readdirSync(timestampedFolder);
  if (dirChildren.length != 1) {
    console.log("uploadFiles: Files could not be organized into their proper directories");
    await utils.removeFiles(req.files[0].destination);
    return false;
  }
  const userDefinedRootDir = dirChildren[0];
  const userDefinedRootDirLocal = `${timestampedFolder}/${userDefinedRootDir}/`;

  const validBids = await runBidsValidation(userDefinedRootDirLocal);
  if (!validBids) {
    await utils.removeFiles(timestampedFolder);
    return false;
  }

  const { root, filename: carFilename } = await packToFs({
    input: userDefinedRootDirLocal,
    output: `${timestampedFolder}/${userDefinedRootDir}.car`,
    blockstore: new FsBlockStore(),
  });

  // Upload file
  console.log(`Uploading ${carFilename} to Estuary`);
  const file = fs.createReadStream(carFilename);
  const uploadResp = await estuaryWrapper.uploadFile(file, 3);
  // const uploadResp = { cid: "0x124", estuaryId: "81" }; // THIS LINE IS FOR TESTING ONLY
  await utils.removeFiles(timestampedFolder);
  if (!uploadResp) {
    console.log(`Failed to upload ${carFilename} to Estuary`);
    return false;
  }
  const newUploadCid = uploadResp.cid;
  const newUploadEstuaryId = uploadResp.estuaryId;

  // Delete this file from Estuary and exit if the user has already uploaded a file with this CID
  const matchingChunkDocuments = await dbWrapper.getChunks({ "storageIds.cid": newUploadCid });
  if (matchingChunkDocuments.length > 0) {
    console.log("User has already uploaded this file");
    await estuaryWrapper.deleteFile(newUploadEstuaryId);
    return false;
  }

  const sumFileSizes = files.map((file) => file.size).reduce((a, b) => a + b);

  const datasetMetadata = {
    title: userDefinedRootDir,
    uploader: address,
    size: sumFileSizes,
  };
  const chunkMetadata = {
    storageIds: { cid: newUploadCid, estuaryId: parseInt(newUploadEstuaryId) },
    size: sumFileSizes,
  };
  const insertSuccess = await insertMetadata(datasetMetadata, chunkMetadata, files);
  if (!insertSuccess) {
    console.log("Failed to upload metadata files to database. Removing file from Estuary and exiting.");
    await estuaryWrapper.deleteFile(newUploadEstuaryId);
  } else {
    console.log(`Successfully uploaded files for ${address}`);
  }
  return insertSuccess;
};

module.exports = {
  uploadFiles: async (req, res) => {
    const success = await uploadFiles(req);
    if (success) {
      return res.status(200).json({
        data: `Successfully uploaded file(s) for ${req.body.address}`,
      });
    }
    return res.status(400).json({ error: `An error ocurred` });
  },
};
