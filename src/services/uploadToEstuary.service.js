const express = require("express");
const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");
const dbWrapper = require("../utils/dbWrapper");
const estuaryWrapper = require("../utils/estuaryWrapper");

const uploadFile = async (req) => {
  console.log("uploadFile: Entered");
  if (!req.body.address || !req.file) {
    return false;
  }
  if (req.body.address.length != 42 || req.body.address.substring(0, 2) != "0x") {
    return false;
  }
  const address = req.body.address.toLowerCase();
  console.log(req.file);

  // Rename file
  const fileDir = req.file.path.replace(req.file.filename, "");
  const newPath = fileDir + req.file.originalname;
  fs.renameSync(req.file.path, newPath);

  // Get metadata for all Estuary pins before file upload
  const pinsMetadataBefore = await estuaryWrapper.getPinsList();
  if (!pinsMetadataBefore) return false;

  // Upload file
  console.log(`Uploading ${req.file.originalname} to Estuary`);
  const file = fs.createReadStream(newPath);
  const success = await estuaryWrapper.uploadFile(file);
  fs.unlink(file.path, (err) => {
    if (err) throw err;
    console.log(`Removed ${file.path}`);
  });
  if (!success) return false;

  // Get metadata for all Estuary pins after file upload
  const pinsMetadataAfter = await estuaryWrapper.getPinsList();
  if (!pinsMetadataAfter) return false;
  const newPinsMetadata = pinsMetadataAfter.filter(({ requestid: rid1 }) => !pinsMetadataBefore.some(({ requestid: rid2 }) => rid1 == rid2));
  // Get metadata for the uploaded file
  let newPinMetadata;
  if (newPinsMetadata.length === 1) {
    newPinMetadata = {
      address: address,
      filename: newPinsMetadata[0].filename,
      cid: newPinsMetadata[0].cid,
      requestid: newPinsMetadata[0].requestid,
    };
  } else {
    console.log(`newPinsMetadata.length: ${newPinsMetadata.length}`);
    console.log(
      "uploadToEstuary: ERROR: Could not determine the cid, filename, and requestid for the " +
        "uploaded file. Multiple files might have been uploaded at nearly the same time, causing this ambiguity."
    );
    return false;
  }

  // If metadata for uploaded file is already in db, update db. Otherwise insert.
  const fileMetadata = await dbWrapper.selectFile("cid", newPinMetadata["cid"]);
  if (fileMetadata) {
    return false;
  } else {
    const columns = "(address, filename, cid, requestid)";
    const params = [address, newPinMetadata["filename"], newPinMetadata["cid"], newPinMetadata["requestid"]];
    console.log(`uploadFile: Inserting row into files: columns: ${columns} params: ${params}`);
    dbWrapper.runSql(`INSERT INTO files ${columns} VALUES (?, ?, ?, ?)`, params);
  }
  return true;
};

module.exports = {
  uploadFile: async (req, res) => {
    if (req.get("Authorization") != `Basic ${process.env.AUTH_TOKEN}`) {
      return res.status(403).json({ error: "Incorrect Authorization header." });
    }
    const success = await uploadFile(req);
    if (success) {
      return res.status(200).json({
        data: `Successfully uploaded file ${req.file.originalname} for ${req.body.address}`,
      });
    }
    return res.status(400).json({ error: `An error ocurred` });
  },
};
