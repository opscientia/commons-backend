const express = require("express");
const router = express.Router();

const getDatasetDescriptionService = require("../services/getDatasetDescription.service");

router.get("/", getDatasetDescriptionService.getDatasetDescription);

module.exports = router;
