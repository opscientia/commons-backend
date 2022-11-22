const express = require("express");
const axios = require("axios");
const fse = require("fs-extra");
const mongodb = require("mongodb");
const web3 = require("web3");
const { ethers } = require("ethers");
const { packToFs } = require("ipfs-car/pack/fs");
const { FsBlockStore } = require("ipfs-car/blockstore/fs");
const { unpackToFs } = require("ipfs-car/unpack/fs");
const sanitizeHtml = require("sanitize-html");
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
    const datasets = await dbWrapper.getDatasets({ uploader: address, blacklisted: false });
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
  console.log(`${new Date().toISOString()} getAllPublishedDatasets: entered`);
  try {
    const datasets = await dbWrapper.getDatasets({ published: true, blacklisted: false})
  return res.status(404).json({ error: "There are no published datasets" });
};

const getPublishedDatasetById = async (req, res) => {
  console.log(`${new Date().toISOString()} getPublishedDatasetById: entered`);
  if (!req.query.id) {
    const message = "Please specify the dataset ID via the id query parameter";
    return res.status(404).json({ error: message });
  }
  try {
    const query = { _id: mongodb.ObjectId(req.query.id), published: true, blacklisted: false };
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

const getPublishedDatasetsByUploader = async (req, res) => {
  console.log(`${new Date().toISOString()} getPublishedDatasetsByUploader: entered`);
  if (!req.query.uploader) {
    const msg = "Please dataset uploader with the uploader query parameter";
    return res.status(400).json({ error: msg });
  }
  const uploader = req.query.uploader.toLowerCase();
  try {
    // Get dataset first to ensure datasetId refers to a published dataset
    const dsQuery = { uploader: uploader, published: true, blacklisted: false };
    const datasets = await dbWrapper.getDatasets(dsQuery);
    if (datasets.length > 0) {
      return res.status(200).json(datasets);
    }
  } catch (err) {
    console.log(err);
  }
  const msg = `Found no datasets whose uploader is ${uploader}`;
  return res.status(404).json({ error: msg });
};

const searchPublishedDatasets = async (req, res) => {
  console.log(`${new Date().toISOString()} searchPublishedDatasets: entered`);
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
      blacklisted: false
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
  console.log(`${new Date().toISOString()} publishDataset: entered`);
  const address = sanitizeHtml(req.body.address?.toLowerCase());
  const signature = sanitizeHtml(req.body.signature);
  const datasetId = sanitizeHtml(req.body.datasetId);
  const title = sanitizeHtml(req.body.title);
  const description = sanitizeHtml(req.body.description);
  const authorsStrArr = req.body.authors?.split(",")?.map((author) => sanitizeHtml(author));
  const keywords = req.body.keywords?.split(",")?.map((keyword) => sanitizeHtml(keyword));
  if (!address || !signature || !datasetId || !title || !description || !authorsStrArr) {
    console.log(`${new Date().toISOString()} publishDataset: parameter(s) not provided`);
    console.log(`parameters: [${address}, ${signature}, ${datasetId}, ${title}, ${description}, ${authorsStrArr}]`);
    return res.status(400).json({ error: "Failed to publish dataset. Missing parameters." });
  }

  // Check signature
  const msg = `${req.body.address}${datasetId}`;
  const authSuccess = utils.assertSignerIsAddress(msg, signature, address);
  if (!authSuccess) {
    console.log(`signer != address`);
    return res.status(400).json({ error: "Failed to publish dataset. Signer != address" });
  }

  // TODO!! -- Find a way to check that an author has not already been added. Perhaps require ORCID
  const authorIds = [];
  const authors = authorsStrArr.map((authorStr) => {
    const authorId = new mongodb.ObjectId();
    authorIds.push(authorId);
    return {
      _id: authorId,
      name: authorStr,
    };
  });
  for (const author of authors) {
    if (!(await dbWrapper.insertAuthor(author))) {
      return res.status(400).json({ error: "Failed to insert author into database" });
    }
  }
  let success = false;
  try {
    const query = { uploader: address, _id: mongodb.ObjectId(datasetId) };
    const updateDocument = {
      $set: {
        published: true,
        title: title,
        description: description,
        authors: authorIds,
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
  console.log(`${new Date().toISOString()} publishDataset: failed to publish dataset ${datasetId} for ${address}`);
  return res.status(400).json({ error: "Failed to publish dataset." });
};

// Get a dataset's child chunks
const getPublishedChunksByDatasetId = async (req, res) => {
  console.log(`${new Date().toISOString()} getPublishedChunksByDatasetId: entered`);
  if (!req.query.datasetId) {
    const msg = "Please specify the chunk's parent dataset with the datasetId query parameter";
    return res.status(400).json({ error: msg });
  }
  try {
    // Get dataset first to ensure datasetId refers to a published dataset
    const dsQuery = { _id: mongodb.ObjectId(req.query.datasetId), published: true, blacklisted: false };
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
  console.log(`${new Date().toISOString()} getFileMetadata: entered`);
  if (!req.query.address) {
    const message = "Please specify the uploader with the address query parameter";
    return res.status(400).json({ error: message });
  }
  const address = req.query.address.toLowerCase();

  try {
    const datasets = await dbWrapper.getDatasets({ uploader: address, blacklisted: false });
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
 * Delete file by address && estuaryId.
 * If path is specified, only the file designated by path is deleted. If path is not specified,
 * the entire CAR file designated by estuaryId is deleted.
 */
const deleteFileMetadata = async (req, res) => {
  console.log(`${new Date().toISOString()} deleteFileMetadata: Entered`);
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
  const msg = `/metadata/files?address=${req.query.address}&estuaryId=${estuaryId}`;
  const authSuccess = utils.assertSignerIsAddress(msg, signature, address);
  if (!authSuccess) {
    console.log(`signer != address`);
    return res.status(400).json({ error: "Failed to delete file metadata. Signer != address" });
  }
  // TODO: Allow deletion of single files
  // Delete entire dataset
  const chunks = await dbWrapper.getChunks({ "storageIds.estuaryId": estuaryId });
  if (!chunks || chunks.length == 0) {
    const message = "Failed to delete file metadata. No corresponding chunks found.";
    return res.status(404).json({ error: message });
  }
  const datasetId = chunks[0].datasetId;
  const datasets = await dbWrapper.getDatasets({ _id: datasetId, blacklisted: false });
  if (!datasets || datasets.length == 0) {
    const message = "Failed to delete file metadata. No corresponding datasets found.";
    return res.status(404).json({ error: message });
  }
  const dataset = datasets[0];
  if (dataset.published) {
    console.log(`${new Date().toISOString()} deleteFileMetadata: Trying to delete published dataset. Exiting.`);
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

const getAuthorsByDatasetId = async (req, res) => {
  console.log(`${new Date().toISOString()} getAuthorsByDatasetId: entered`);
  if (!req.query.datasetId) {
    const message = "Please specify the dataset ID via the datasetId query parameter";
    return res.status(404).json({ error: message });
  }
  try {
    const query = { _id: mongodb.ObjectId(req.query.datasetId), published: true, blacklisted: false };
    const datasets = await dbWrapper.getDatasets(query);
    if (datasets?.length > 0) {
      const authorIds = datasets[0].authors.map((idStr) => mongodb.ObjectId(idStr));
      const authorsQuery = { _id: { $in: authorIds } };
      const authors = await dbWrapper.getAuthors(authorsQuery);
      if (authors.length > 0) {
        return res.status(200).json(authors);
      }
    }
  } catch (err) {
    console.log(err);
  }
  const message = "There are no authors for the specified dataset";
  return res.status(400).json({ error: message });
};

module.exports = {
  getDatasetMetadata: getDatasetMetadata,
  getPublishedDatasets: getPublishedDatasets,
  getPublishedDatasetsByUploader: getPublishedDatasetsByUploader,
  searchPublishedDatasets: searchPublishedDatasets,
  publishDataset: publishDataset,
  getPublishedChunks: getPublishedChunksByDatasetId,
  getFileMetadata: getFileMetadata,
  deleteFileMetadata: deleteFileMetadata,
  getAuthorsByDatasetId: getAuthorsByDatasetId,
};
