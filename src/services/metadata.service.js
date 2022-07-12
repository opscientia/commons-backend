const express = require("express");
const axios = require("axios");
const fse = require("fs-extra");
const mongodb = require("mongodb");
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
 * Get dataset metadata for every dataset belonging to the specified address.
 * (Does not require authentication.)
 */
const getDatasetMetadata = async (req, res) => {
  if (!req.query.address) {
    const message = "Please specify the dataset uploader with the address query parameter";
    return res.status(400).json({ error: message });
  }
  const address = req.query.address.toLowerCase();

  try {
    const datasets = await dbWrapper.getDatasets({ uploader: address });
    return res.status(200).json(datasets);
  } catch (err) {
    console.log(err);
  }
  return res.status(404).json({ error: "No datasets for the specified address" });
};

const getPublishedDatasets = async (req, res) => {
  if (req.query.id) {
    return await getPublishedDatasetById(req, res);
  } else {
    return await getAllPublishedDatasets(req, res);
  }
};

/**
 * Get dataset metadata for every published dataset.
 * (Does not require authentication.)
 */
const getAllPublishedDatasets = async (req, res) => {
  console.log("getAllPublishedDatasets: entered");
  try {
    const datasets = await dbWrapper.getDatasets({ published: true });
    return res.status(200).json(datasets);
  } catch (err) {
    console.log(err);
  }
  return res.status(404).json({ error: "There are no published datasets" });
};

const getPublishedDatasetById = async (req, res) => {
  console.log("getPublishedDatasetById: entered");
  if (!req.query.id) {
    const message = "Please specify the dataset ID via the id query parameter";
    return res.status(404).json({ error: message });
  }
  try {
    const query = { _id: mongodb.ObjectId(req.query.id), published: true };
    const datasets = await dbWrapper.getDatasets(query);
    if (datasets?.length > 0) {
      return res.status(200).json(datasets[0]);
    }
  } catch (err) {
    console.log(err);
  }
  const message = "There is no published dataset with the specified id";
  return res.status(404).json({ error: message });
};

const searchPublishedDatasets = async (req, res) => {
  console.log("searchPublishedDatasets: entered");
  const searchStr = req.query.searchStr;
  if (!searchStr) {
    const message = "Please provide a search string via the searchStr query parameter";
    return res.status(400).json({ error: message });
  }
  try {
    const query = {
      published: true,
      $text: {
        $search: searchStr,
      },
    };
    const datasets = await dbWrapper.getDatasets(query);
    return res.status(200).json(datasets);
  } catch (err) {
    console.log(err);
  }
  return res.status(404).json({ error: "No published datasets found" });
};

/**
 * On the dataset specified by the provided datasetId, set published to true.
 * body params: address, signature, datasetId, title, description, authors, keywords
 */
const publishDataset = async (req, res) => {
  console.log("publishDataset: entered");
  const address = req.body.address?.toLowerCase();
  const signature = req.body.signature;
  const datasetId = req.body.datasetId;
  const title = req.body.title;
  const description = req.body.description;
  const authors = req.body.authors?.split(",");
  const keywords = req.body.keywords?.split(",");
  if (!address || !signature || !datasetId || !title || !description || !authors) {
    console.log("publishDataset: parameter(s) not provided");
    console.log(`parameters: [${address}, ${signature}, ${datasetId}, ${title}, ${description}, ${authors}]`);
    return res.status(400).json({ error: "Failed to publish dataset. Missing parameters." });
  }

  // Check signature
  const msg = `${req.body.address}${datasetId}`;
  const msgHash = web3.utils.sha3(msg);
  const signer = ethers.utils.recoverAddress(msgHash, signature).toLowerCase();
  if (signer != address) {
    console.log(`signer != address\nsigner: ${signer}\naddress: ${address}`);
    return res.status(400).json({ error: "Failed to publish dataset. Signer != address" });
  }

  let success = false;
  try {
    const query = { uploader: address, _id: mongodb.ObjectId(datasetId) };
    const updateDocument = {
      $set: {
        published: true,
        title: title,
        description: description,
        authors: authors,
        keywords: keywords,
      },
    };
    for (let i = 0; i < 3; i++) {
      success = await dbWrapper.updateDataset(query, updateDocument);
      if (success) {
        console.log(`publisDataset: successfully published dataset ${datasetId} for ${address}`);
        const message = `Successfully published dataset ${datasetId} for ${address}`;
        return res.status(200).json({ message: message });
      }
    }
  } catch (err) {
    console.log(err);
  }
  console.log(`publishDataset: failed to publish dataset ${datasetId} for ${address}`);
  return res.status(400).json({ error: "Failed to publish dataset." });
};

// Get a dataset's child chunks
const getPublishedChunksByDatasetId = async (req, res) => {
  console.log("getPublishedChunksByDatasetId: entered");
  if (!req.query.datasetId) {
    const msg = "Please specify the chunk's parent dataset with the datasetId query parameter";
    return res.status(400).json({ error: msg });
  }
  try {
    // Get dataset first to ensure datasetId refers to a published dataset
    const dsQuery = { _id: mongodb.ObjectId(req.query.datasetId), published: true };
    const datasets = await dbWrapper.getDatasets(dsQuery);
    if (datasets.length > 0) {
      const chunksQuery = { datasetId: mongodb.ObjectId(req.query.datasetId) };
      const chunks = await dbWrapper.getChunks(chunksQuery);
      return res.status(200).json(chunks);
    }
  } catch (err) {
    console.log(err);
  }
  const msg = `Found no chunks whose parent dataset is ${req.query.datasetId}`;
  return res.status(404).json({ error: msg });
};

/**
 * Get file metadata for every file belonging to the specified address.
 * (Does not require authentication. Only modifications to a user's files require authentication.)
 */
const getFileMetadata = async (req, res) => {
  console.log("getFileMetadata: entered");
  if (!req.query.address) {
    const message = "Please specify the uploader with the address query parameter";
    return res.status(400).json({ error: message });
  }
  const address = req.query.address.toLowerCase();

  try {
    const datasets = await dbWrapper.getDatasets({ uploader: address });
    const chunkIds = [];
    for (const dataset of datasets) {
      chunkIds.push(...dataset.chunkIds);
    }
    const chunksQuery = {
      _id: {
        $in: chunkIds,
      },
    };
    const chunks = await dbWrapper.getChunks(chunksQuery);
    const fileIdToEstuaryId = {};
    const fileIds = [];
    for (const chunk of chunks) {
      for (const fileId of chunk.fileIds) {
        fileIdToEstuaryId[fileId] = chunk.storageIds.estuaryId;
        fileIds.push(fileId);
      }
    }
    const filesQuery = {
      _id: {
        $in: fileIds,
      },
    };
    const files = await dbWrapper.getCommonsFiles(filesQuery);
    const filesWithEstIds = files.map((file) => ({
      ...file,
      // TODO: There must be a better way to return the estuaryIds of the datasets
      estuaryId: fileIdToEstuaryId[file._id],
    }));
    return res.status(200).json(filesWithEstIds);
  } catch (err) {
    console.log(err);
  }
  return res.status(400).json({ error: "No files for the specified address" });
};

/**
 * Delete file by address && estuaryId && (optionally) path.
 * If path is specified, only the file designated by path is deleted. If path is not specified,
 * the entire CAR file designated by estuaryId is deleted.
 */
const deleteFileMetadata = async (req, res) => {
  console.log("deleteFileMetadata: Entered");
  if (!req.query.address || !req.query.estuaryId || !req.query.signature) {
    return res.status(400).json({ error: "Missing parameter(s)" });
  }
  if (req.query.address.length != 42 || req.query.address.substring(0, 2) != "0x") {
    const message = "Address must start with 0x and be less than 42 characters long";
    return res.status(400).json({ error: message });
  }
  const address = req.query.address.toLowerCase();
  const estuaryId = parseInt(req.query.estuaryId);
  const path = req.query.path;
  const signature = req.query.signature;

  // Ensure signer == address == address associated with this estuaryId
  let strToSign = `/metadata/files?address=${req.query.address}&estuaryId=${estuaryId}`;
  const hashedStr = web3.utils.sha3(strToSign);
  let signer;
  try {
    signer = ethers.utils.recoverAddress(hashedStr, signature).toLowerCase();
  } catch (err) {
    console.log(err);
    console.log("deleteFileMetadata: malformed signature");
    return res.status(400).json({ error: "Malformed signature" });
  }
  if (signer != address) {
    console.log("deleteFileMetadata: signer != address");
    console.log(`deleteFileMetadata: signer:  ${signer}`);
    console.log(`deleteFileMetadata: address: ${address}`);
    return res.status(400).json({ error: "Message signer != address" });
  }
  // TODO: Allow deletion of single files
  // Delete entire dataset
  const chunks = await dbWrapper.getChunks({ "storageIds.estuaryId": estuaryId });
  // TODO: check chunks length
  const datasetId = chunks[0].datasetId;
  const datasets = await dbWrapper.getDatasets({ _id: datasetId });
  // TODO: check datasets length
  const dataset = datasets[0];
  if (dataset.published) {
    console.log("deleteFileMetadata: Trying to delete published dataset. Exiting.");
    return res.status(400).json({ error: "Cannot delete published dataset" });
  }
  const datasetChildChunkIds = dataset.chunkIds;
  let successfulDelete = await dbWrapper.deleteCommonsFiles({ chunkId: { $in: datasetChildChunkIds } });
  // TODO: Check successfulDelete
  successfulDelete = await dbWrapper.deleteChunks({ _id: { $in: datasetChildChunkIds } });
  // TODO: Check successfulDelete
  successfulDelete = await dbWrapper.deleteDataset({ _id: datasetId });
  // TODO: Check successfulDelete
  successfulDelete = await estuaryWrapper.deleteFile(estuaryId, 5);
  if (successfulDelete) {
    const message = `Successfully deleted file metadata for file with estuaryId: ${estuaryId}`;
    return res.status(200).json({ data: message });
  }
  return res.status(400).json({ error: "An unknown error occurred. Failed to delete dataset." });
};

module.exports = {
  getDatasetMetadata: getDatasetMetadata,
  getPublishedDatasets: getPublishedDatasets,
  searchPublishedDatasets: searchPublishedDatasets,
  publishDataset: publishDataset,
  getPublishedChunks: getPublishedChunksByDatasetId,
  getFileMetadata: getFileMetadata,
  deleteFileMetadata: deleteFileMetadata,
};
