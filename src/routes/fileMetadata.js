const express = require("express");
const router = express.Router();

const fileMetadataService = require("../services/fileMetadata.service");

router.get("/", fileMetadataService.getFileMetadata);
// router.post('/', fileMetadataService.setFileMetadata)
router.delete("/", fileMetadataService.deleteFileMetadata);

module.exports = router;
