const express = require("express");
const router = express.Router();

const initializeUpload = require("../services/initializeUpload.service");

router.get("/", initializeUpload.initializeUpload);

module.exports = router;
