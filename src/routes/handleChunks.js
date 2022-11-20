const express = require("express");
const router = express.Router();

const collectChunks = require("../services/handleChunks.service");

router.get("/", collectChunks.handleChunks);

module.exports = router;
