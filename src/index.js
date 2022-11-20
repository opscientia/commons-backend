const express = require("express");
const cors = require("cors");

const metadata = require("./routes/metadata");
const uploadToEstuary = require("./routes/uploadToEstuary");
const initializeUpload = require("./routes/initializeUpload");
const collectChunks = require("../src/routes/handleChunks")
const app = express();

const corsOptions = {
  // origin: ["https://commons.opsci.io"],
  origin: true,
};

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors(corsOptions));

app.use("/metadata", metadata);
app.use("/uploadToEstuary", uploadToEstuary);
app.use("/initializeUpload", initializeUpload);
app.use("/collectChunks", collectChunks);


module.exports = app;
