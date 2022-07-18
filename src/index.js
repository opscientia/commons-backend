const express = require("express");
const cors = require("cors");

const metadata = require("./routes/metadata");
const uploadToEstuary = require("./routes/uploadToEstuary");
const getDatasetDescription = require("./routes/getDatasetDescription");
const initializeUpload = require("./routes/initializeUpload");

const app = express();

const corsOptions = {
  origin: ["https://commons.opsci.io"],
  // origin: true,
};

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors(corsOptions));

app.use("/metadata", metadata);
app.use("/uploadToEstuary", uploadToEstuary);
app.use("/initializeUpload", initializeUpload);

module.exports = app;
