const express = require("express");
const router = express.Router();

const collectChunks = require("../services/collectChunks.service");

router.get("/", collectChunks.collectChunks);

module.exports = router;
