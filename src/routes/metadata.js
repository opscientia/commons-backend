const express = require("express");
const router = express.Router();

const metadataService = require("../services/metadata.service");

router.get("/datasets/", metadataService.getDatasetMetadata);
router.get("/datasets/published", metadataService.getPublishedDatasets);
router.get("/datasets/published/byUploader", metadataService.getPublishedDatasetsByUploader);
router.get("/datasets/published/search", metadataService.searchPublishedDatasets);
router.post("/datasets/publish", metadataService.publishDataset);
router.get("/chunks/published", metadataService.getPublishedChunks);
router.get("/files/", metadataService.getFileMetadata);
router.delete("/files/", metadataService.deleteFileMetadata);
router.get("/authors/", metadataService.getAuthorsByDatasetId);

module.exports = router;
