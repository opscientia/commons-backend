const express = require("express");
const axios = require("axios");
const fs = require("fs");
const fse = require("fs-extra");
const web3 = require("web3");
const { ethers } = require("ethers");
const { FsBlockStore } = require("ipfs-car/blockstore/fs");
const { unpackToFs } = require("ipfs-car/unpack/fs");
const dbWrapper = require("../utils/dbWrapper");
const estuaryWrapper = require("../utils/estuaryWrapper");
const utils = require("../utils/utils");

const ensureDir = async (dir) => {
  try {
    await fse.ensureDir(dir);
    return true;
  } catch (err) {
    console.error(err);
    console.log(`Failed to create dir ${dir}`);
    return false;
  }
};

/**
 * Get dataset_description.json in the CAR file specified by the requestid.
 * Returns the dataset_description.json as JSON, not as a file.
 * If the file specified by requestid is not a CAR file or does not contain
 * a dataset_description.json in the root folder, an empty JSON object is returned.
 * Example:
 * curl -X GET http://localhost:3005/getDatasetDescription?requestid=12345
 */
const getDatasetDescription = async (req) => {
  console.log("getDatasetDescription: Entered");
  if (!req.query.requestid) return undefined;
  const requestid = parseInt(req.query.requestid);

  const file = await dbWrapper.selectFile(["requestid"], [requestid]);
  if (!file) return undefined;

  try {
    // Get and unpack CAR
    const tempFolder = `estuaryUploads/${file.carcid + Date.now()}`;
    const fileDest = `${tempFolder}/${file.carcid}.car`;
    const unpackedCarDest = fileDest.slice(0, -4);
    if (!(await ensureDir(tempFolder))) return undefined;
    await utils.downloadFile(`https://ipfs.io/ipfs/${file.carcid}`, fileDest);
    await unpackToFs({ input: fileDest, output: unpackedCarDest });

    // Get root dir of unpacked CAR
    const dirChildren = fs.readdirSync(unpackedCarDest);
    if (dirChildren.length != 1) {
      console.log(`getDatasetDescription: There are multiple root dirs for dataset designated by requestid ${requestid}. Exiting`);
      await utils.removeFiles(tempFolder);
      return false;
    }
    const userDefinedRootDir = dirChildren[0];
    const userDefinedRootDirLocal = `${unpackedCarDest}/${userDefinedRootDir}`;

    // Ensure dataset_description.json exists in root dir
    const filepath = `${userDefinedRootDirLocal}/dataset_description.json`;
    const fileExists = await fse.pathExists(filepath);
    if (!fileExists) {
      console.log(`getDatasetDescription: No dataset_description.json for dataset designated by requestid ${requestid}`);
      await utils.removeFiles(tempFolder);
      return undefined;
    }

    // Read and return dataset description
    const datasetDescription = fse.readJsonSync(filepath, { throws: false });
    await utils.removeFiles(tempFolder);
    if (!datasetDescription) {
      console.log(`getDatasetDescription: Could not read dataset_description.json for dataset designated by requestid ${requestid}`);
      return undefined;
    }
    console.log(`getDatasetDescription: Retrieved dataset_description.json for dataset designated by requestid ${requestid}`);
    return datasetDescription;
  } catch (err) {
    console.log(err);
    return false;
  }
};

module.exports = {
  getDatasetDescription: async (req, res) => {
    const desc = await getDatasetDescription(req);
    if (desc) {
      return res.status(200).json(desc);
    }
    return res.status(400).json({});
  },
};
