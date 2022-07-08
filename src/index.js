const express = require("express");
const cors = require("cors");

const metadata = require("./routes/metadata");
const uploadToEstuary = require("./routes/uploadToEstuary");
const getDatasetDescription = require("./routes/getDatasetDescription");
const initializeUpload = require("./routes/initializeUpload");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

app.use("/metadata", metadata);
app.use("/uploadToEstuary", uploadToEstuary);
app.use("/getDatasetDescription", getDatasetDescription);
app.use("/initializeUpload", initializeUpload);

module.exports = app;
