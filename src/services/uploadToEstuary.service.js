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
          resolve();
        } else {
          console.log("BIDS validation succeeded");
          resolve({ summary: summary, issues: issues });
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
    return { error: "Missing argument. Please provide address files and signature." };
  }
  if (req.body.address.length != 42 || req.body.address.substring(0, 2) != "0x") {
    console.log("Invalid address");
    await utils.removeFiles(req.files[0].destination);
    return { error: "Invalid address. Address must be 42 characters long and start with 0x." };
  }
  const address = req.body.address.toLowerCase();
  const secretMessage = msgCache.take(address);
  if (!secretMessage) {
    console.log(`No secret message for ${address} at time ${Date.now()}`);
    await utils.removeFiles(req.files[0].destination);
    return { error: `No secret message for ${address} at time ${Date.now()}` };
  }
  const msgHash = web3.utils.sha3(secretMessage);
  const signer = (await ethers.utils.recoverAddress(msgHash, req.body.signature)).toLowerCase();
  if (signer != address) {
    console.log(`signer != address\nsigner: ${signer}\naddress: ${address}`);
    await utils.removeFiles(req.files[0].destination);
    return { error: `No secret message for ${address} in cache. Sign secret message before uploading.` };
  }

  // Check that user has Holo
  try {
    const resp = await axios.get("https://sciverse.id/api/getAllUserAddresses");
    // const holoAddresses = resp.data;
    // if (!holoAddresses.includes(address)) {
    //   console.log("User is not authorized to upload. They do not have a Holo.");
    //   await utils.removeFiles(req.files[0].destination);
    //   return { error: "User is not authorized to upload. They do not have a Holo." };
    // }
  } catch (err) {
    console.log("User is not authorized to upload. They do not have a Holo.");
    console.log(err);
    await utils.removeFiles(req.files[0].destination);
    return { error: "User is not authorized to upload. They do not have a Holo." };
  }

  return { success: "Initial input validation succeeded." };
};

// Move uploaded files into the folders that the user had them in.
// E.g., if user uploaded /testdir/abc.txt, move the local file abc.txt to <tmpFolder>/testdir/abc.txt
const moveFilesToCorrectFolders = async (req) => {
  const files = [];
  const timestampedFolder = req.files[0].destination;
  for (const file of req.files) {
    if (typeof req.body[file.originalname] != "string") {
      // Check if these files are in .git folder. If so, ignore and continue.
      if (Array.isArray(req.body[file.originalname]) && req.body[file.originalname].length > 0) {
        if (req.body[file.originalname][0].includes("/.git/")) {
          continue;
        }
      }
      console.log("error: typeof req.body[file.originalname] != string");
      console.log("req.body[file.originalname]...");
      console.log(req.body[file.originalname]);
      return [];
    }
    if (req.body[file.originalname].includes("/.git/")) {
      // Skip files in .git folder
      continue;
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

/**
 * Add certain ignore rules to .bidsignore file in root of specified dir.
 * If no .bidsignore file exists in root of specified dir, one is created.
 * @param dir Must end with forward slash ('/').
 */
const addBidsIgnoreRules = async (dir) => {
  const linesArr = [
    "*~",
    "tmp_dcm2bids",
    "bids.validator.history.txt",
    "#bids.validator.txt#",
    "#bids.validator.txt#",
    "bids-validator.log",
  ];
  const lines = "\n" + linesArr.join("\n");
  try {
    const filepath = `${dir}.bidsignore`;
    await fse.ensureFile(filepath);
    fs.appendFileSync(filepath, lines);
    return true;
  } catch (err) {
    console.log(err);
  }
  return false;
};

const generateCommonsFile = (file, chunkId) => {
  if (!file.path.startsWith("/")) {
    file.path = "/" + file.path;
  }
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
        validated: params.standard?.bids?.validated || true,
        version: params.standard?.bids?.version || "1.9.3",
        deidentified: params.standard?.bids?.deidentified || false,
        modalities: params.standard?.bids?.modalities || [],
        tasks: params.standard?.bids?.tasks || [],
        warnings: params.standard?.bids?.warnings || [],
        errors: params.standard?.bids?.errors || [],
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
      standard: datasetMetadata.standard,
    });
    acknowledged = await dbWrapper.insertDataset(dataset);
    if (acknowledged) break;
  }
  if (!acknowledged) {
    console.log(`${new Date().toISOString()} Request to insert dataset metadata was not acknowledged by database. Exiting.`);
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
    console.log(`${new Date().toISOString()} Request to insert chunk metadata was not acknowledged by database. Exiting.`);
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
      console.log(`${new Date().toISOString()} Request to insert commonsFile metadata was not acknowledged by database. Exiting.`);
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
    console.log(`${new Date().toISOString()} Failed to set chunk.files in database. Exiting.`);
  }
  return updateSuccess;
};

const uploadFiles = async (req, res) => {
  // TODO: chunking

  console.log(`${new Date().toISOString()} uploadFile: Entered`);
  const initValidation = await runInitialInputValidation(req);
  if (initValidation.error) {
    return res.status(400).json({ error: `Failed initial input validation. Problem: ${initValidation.error}` });
  }
  // console.log(req.files);

  const address = req.body.address.toLowerCase();
  const path = req.body.path; // path of uploaded folder from root (this is used by the frontend)

  const files = await moveFilesToCorrectFolders(req);
  if (files.length == 0) {
    const message = "Files could not be organized into their proper directories.";
    console.log(`${new Date().toISOString()} uploadFiles: ${message}`);
    await utils.removeFiles(req.files[0].destination);
    return res.status(400).json({ error: message });
  }

  const timestampedFolder = req.files[0].destination;
  const dirChildren = fs.readdirSync(timestampedFolder);
  if (dirChildren.length != 1) {
    const message = "Files could not be organized into their proper directories.";
    console.log(`${new Date().toISOString()} uploadFiles: ${message}`);
    await utils.removeFiles(req.files[0].destination);
    return res.status(400).json({ error: message });
  }
  const userDefinedRootDir = dirChildren[0];
  const userDefinedRootDirLocal = `${timestampedFolder}/${userDefinedRootDir}/`;

  await addBidsIgnoreRules(userDefinedRootDirLocal);

  const validatorData = await runBidsValidation(userDefinedRootDirLocal);
  if (!validatorData) {
    await utils.removeFiles(timestampedFolder);
    return res.status(400).json({ error: "BIDS validation failed." });
  }

  const { root, filename: carFilename } = await packToFs({
    input: userDefinedRootDirLocal,
    output: `${timestampedFolder}/${userDefinedRootDir}.car`,
    blockstore: new FsBlockStore(),
  });

  // Upload file
  console.log(`${new Date().toISOString()} Uploading ${carFilename} to Estuary`);
  const file = fs.createReadStream(carFilename);
  const uploadResp = await estuaryWrapper.uploadFile(file, 3);
  // const uploadResp = { cid: "0x124", estuaryId: "81" }; // THIS LINE IS FOR TESTING ONLY
  await utils.removeFiles(timestampedFolder);
  if (!uploadResp) {
    console.log(`${new Date().toISOString()} Failed to upload ${carFilename} to Estuary`);
    return res.status(400).json({ error: "An error occurred trying to upload to Estuary. Try again later." });
  }
  const newUploadCid = uploadResp.cid;
  const newUploadEstuaryId = uploadResp.estuaryId;

  // Delete this file from Estuary and exit if the user has already uploaded a file with this CID
  const matchingChunkDocuments = await dbWrapper.getChunks({ "storageIds.cid": newUploadCid });
  if (matchingChunkDocuments.length > 0) {
    console.log(`${new Date().toISOString()} User has already uploaded this file. Removing the duplicate file from Estuary and exiting.`);
    await estuaryWrapper.deleteFile(newUploadEstuaryId);
    return res.status(400).json({ error: "This dataset has already been uploaded." });
  }

  const sumFileSizes = files.map((file) => file.size).reduce((a, b) => a + b);

  const datasetMetadata = {
    title: userDefinedRootDir,
    uploader: address,
    size: sumFileSizes,
    standard: {
      bids: {
        modalities: validatorData.summary.modalities,
        tasks: validatorData.summary.tasks,
        warnings: validatorData.issues.warnings,
        errors: validatorData.issues.errors,
      },
    },
  };
  const chunkMetadata = {
    storageIds: { cid: newUploadCid, estuaryId: parseInt(newUploadEstuaryId) },
    size: sumFileSizes,
  };
  const insertSuccess = await insertMetadata(datasetMetadata, chunkMetadata, files);
  if (!insertSuccess) {
    console.log(`${new Date().toISOString()} Failed to insert metadata into database. Removing file from Estuary and exiting.`);
    await estuaryWrapper.deleteFile(newUploadEstuaryId);
    return res.status(400).json({ error: "Failed to insert metadata into database." });
  } else {
    console.log(`${new Date().toISOString()} Successfully uploaded files for ${address}`);
  }
  return res.status(201).json({
    message: `Successfully uploaded dataset for address ${address}.`,
    cid: newUploadCid,
  });
};

module.exports = {
  uploadFiles: uploadFiles,
};
