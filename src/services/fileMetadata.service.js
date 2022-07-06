const express = require("express");
const axios = require("axios");
const fse = require("fs-extra");
const web3 = require("web3");
const { ethers } = require("ethers");
const { packToFs } = require("ipfs-car/pack/fs");
const { FsBlockStore } = require("ipfs-car/blockstore/fs");
const { unpackToFs } = require("ipfs-car/unpack/fs");
const dbWrapper = require("../utils/dbWrapper");
const estuaryWrapper = require("../utils/estuaryWrapper");
const utils = require("../utils/utils");
const { fetchJson } = require("ethers/lib/utils");

/**
 * Get file metadata for every file belonging to the specified address.
 * (Does not require authentication. Only modifications to a user's files require authentication.)
 * Examples:
 * curl -X GET http://localhost:3005/fileMetadata?address=0x0000000000000000000000000000000000000000
 */
const getFileMetadata = async (req) => {
  if (!req.query.address) {
    return undefined;
  }
  const address = req.query.address.toLowerCase();

  // FILES COLUMN: address, filename, path, carcid, requestid
  // FRONTEND NEEDS: filename, path, requestid

  const datasetsCursor = await dbWrapper.getDatasets({ uploader: address });
  const datasets = datasetsCursor.toArray();
  const chunkIds = [];
  for (const dataset of datasets) {
    chunkIds.push(...dataset.chunks);
  }
  const chunksQuery = {
    _id: {
      $in: chunkIds,
    },
  };
  const chunks = await dbWrapper.getChunks(chunksQuery);
  const fileIds = [];
  for (const chunk of chunks) {
    const filesInChunk = chunk.files.map((file) => {
      // TODO: There must be a better way to return the estuaryIds of the datasets
      file.estuaryId = chunk.storageIds.estuaryId;
      return file;
    });
    fileIds.push(filesInChunk);
  }
  const filesQuery = {
    _id: {
      $in: fileIds,
    },
  };
  const files = await dbWrapper.getFiles(filesQuery);
  return files;
};

/**
 * Delete file by address && requestid && (optionally) path.
 * If path is specified, only the file designated by path is deleted. If path is not specified,
 * the entire CAR file designated by requestid is deleted.
 * Example:
 * curl -X DELETE http://localhost:3005/fileMetadata?address=address=0x0000000000000000000000000000000000000000&requestid=123
 */
const deleteFileMetadata = async (req) => {
  console.log("deleteFileMetadata: Entered");
  if (!req.query.address || !req.query.requestid || !req.query.signature) {
    return false;
  }
  if (req.query.address.length != 42 || req.query.address.substring(0, 2) != "0x") {
    return false;
  }
  const address = req.query.address.toLowerCase();
  const estuaryId = parseInt(req.query.requestid);
  const path = req.query.path;
  const signature = req.query.signature;

  // Ensure signer == address == address associated with this requestid
  let strToSign = `/fileMetadata?address=${req.query.address}&requestid=${requestid}`;
  if (path) strToSign += `&path=${path}`;
  const hashedStr = web3.utils.sha3(strToSign);
  let signer;
  try {
    signer = (await ethers.utils.recoverAddress(hashedStr, signature)).toLowerCase();
  } catch (err) {
    console.log(err);
    console.log("deleteFileMetadata: malformed signature");
    return false;
  }
  if (signer != address) {
    console.log("deleteFileMetadata: signer != address");
    console.log(`deleteFileMetadata: signer:  ${signer}`);
    console.log(`deleteFileMetadata: address: ${address}`);
    return false;
  }
  // TODO: Allow deletion of single files
  // Delete entire dataset
  const chunks = await dbWrapper.getChunks({ "storageIds.estuaryId": estuaryId });
  // TODO: check chunks length
  const datasetId = chunks[0].datasetId;
  const datasets = await dbWrapper.getDatasets({ _id: datasetId });
  // TODO: check datasets length
  const datasetChildChunkIds = datasets[0].chunkIds;
  let successfulDelete = await dbWrapper.deleteCommonsFiles({ chunkId: { $in: datasetChildChunkIds } });
  // TODO: Check successfulDelete
  successfulDelete = await dbWrapper.deleteChunks({ _id: { $in: datasetChildChunkIds } });
  // TODO: Check successfulDelete
  successfulDelete = await dbWrapper.deleteDataset({ _id: datasetId });
  // TODO: Check successfulDelete
  return await estuaryWrapper.deleteFile(estuaryId, 5);
};

module.exports = {
  getFileMetadata: async (req, res) => {
    const files = await getFileMetadata(req);
    if (files) return res.status(200).json(files);
    return res.status(400).json({ error: "No files for the specified address" });
  },
  deleteFileMetadata: async (req, res) => {
    const success = await deleteFileMetadata(req);
    if (success) {
      return res.status(200).json({ data: `Successfully deleted file metadata for file: ${req.body.filename}` });
    }
    return res.status(400).json({ error: `An error ocurred trying to set file metadata for file: ${req.body.filename}` });
  },
};
