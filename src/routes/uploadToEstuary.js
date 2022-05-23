const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ dest: "estuaryUploads/" });

const uploadToEstuaryService = require("../services/uploadToEstuary.service");

router.post("/", upload.array("data"), uploadToEstuaryService.uploadFiles);

module.exports = router;
