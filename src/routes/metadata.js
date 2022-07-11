const express = require("express");
const router = express.Router();

const metadataService = require("../services/metadata.service");

router.get("/datasets/", metadataService.getDatasetMetadata);
router.get("/datasets/published", metadataService.getPublishedDatasets);
router.get("/datasets/published/search", metadataService.searchPublishedDatasets);
router.post("/datasets/publish", metadataService.publishDataset);
router.get("/files/", metadataService.getFileMetadata);
router.delete("/files/", metadataService.deleteFileMetadata);

module.exports = router;
