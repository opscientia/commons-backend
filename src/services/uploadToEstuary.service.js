const express = require("express");
const axios = require("axios");
const fs = require("fs");
const fse = require("fs-extra");
const FormData = require("form-data");
const web3 = require("web3");
const { ethers } = require("ethers");
const { packToFs } = require("ipfs-car/pack/fs");
const { FsBlockStore } = require("ipfs-car/blockstore/fs");
const dbWrapper = require("../utils/dbWrapper");
const estuaryWrapper = require("../utils/estuaryWrapper");
const utils = require("../utils/utils");

const validate = require("bids-validator");

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
          console.log("BIDS validation succeeded");
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
  return true;
};

// Move uploaded files into the folders that the user had them in.
// E.g., if user uploaded /testdir/abc.txt, move the local file abc.txt to <tmpFolder>/testdir/abc.txt
const moveFilesToCorrectFolders = async (req) => {
  const files = [];
  const timestampedFolder = req.files[0].destination;
  for (const file of req.files) {
    const userDefinedPath = req.body[file.originalname].startsWith("/")
      ? req.body[file.originalname].substring(1)
      : req.body[file.originalname];
    if (!userDefinedPath.includes("/")) {
      continue;
    }
    const newLocalFilePath = timestampedFolder + "/" + userDefinedPath;
    file.localFilePath = newLocalFilePath;
    file.userDefinedPath = userDefinedPath;
    file.filename = file.originalname;
    files.push(file);

    try {
      await fse.move(file.path, newLocalFilePath);
    } catch (err) {
      console.log(err);
      return [];
    }
  }
  return files;
};

const uploadFiles = async (req) => {
  console.log("uploadFile: Entered");
  if (!(await runInitialInputValidation(req))) return false;
  console.log(req.files);

  const address = req.body.address.toLowerCase();
  const path = req.body.path; // path of uploaded folder from root (this is used by the frontend)

  const files = await moveFilesToCorrectFolders(req);
  if (files.length == 0) {
    await utils.removeFiles(timestampedFolder);
    return false;
  }

  const timestampedFolder = req.files[0].destination;
  const dirChildren = fs.readdirSync(timestampedFolder);
  if (dirChildren.length != 1) return false;
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
  await utils.removeFiles(timestampedFolder);
  if (!uploadResp) {
    console.log(`Failed to upload ${carFilename} to Estuary`);
    return false;
  }
  const newUploadCid = uploadResp.cid;
  const newUploadRequestId = uploadResp.estuaryId;

  // Delete this file from Estuary and exit if the user has already uploaded a file with this CID
  const fileMetadataRows = await dbWrapper.selectFiles(["carcid", "address"], [newUploadCid, address]);
  if (fileMetadataRows.length > 0) {
    console.log("User has already uploaded this file");
    await estuaryWrapper.deleteFile(newUploadRequestId);
    return false;
  }

  // Insert a row of metadata for every file in the uploaded directory
  for (const file of files) {
    const columns = "(address, filename, path, carcid, requestid)";
    const params = [address, file.filename, file.userDefinedPath, newUploadCid, newUploadRequestId];
    console.log(`uploadFile: Inserting row into files: columns: ${columns} params: ${params}`);
    dbWrapper.runSql(`INSERT INTO files ${columns} VALUES (?, ?, ?, ?, ?)`, params);
  }

  return true;
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
