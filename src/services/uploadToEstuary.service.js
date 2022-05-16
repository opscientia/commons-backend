const express = require("express");
const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");
const web3 = require("web3");
const { ethers } = require("ethers");
const dbWrapper = require("../utils/dbWrapper");
const estuaryWrapper = require("../utils/estuaryWrapper");

const removeFile = (filePath) => {
  fs.unlink(filePath, (err) => {
    if (err) throw err;
    console.log(`Removed ${filePath}`);
  });
};

const validateInput = async (req) => {
  if (!req.body.address || !req.file || !req.body.signature) {
    console.log("Missing argument");
    if (req.file) removeFile(req.file.path);
    return false;
  }
  if (req.body.address.length != 42 || req.body.address.substring(0, 2) != "0x") {
    console.log("Invalid address");
    removeFile(req.file.path);
    return false;
  }
  const address = req.body.address.toLowerCase();
  const fileAsString = fs.readFileSync(req.file.path, "utf8");
  const fileHash = web3.utils.sha3(fileAsString);
  const signer = (await ethers.utils.recoverAddress(fileHash, req.body.signature)).toLowerCase();
  if (signer != address) {
    console.log("signer != address");
    console.log(`signer:  ${signer}`);
    console.log(`address: ${address}`);
    removeFile(req.file.path);
    return false;
  }
  try {
    const user = await dbWrapper.getUserByAddress(address);
    if (user.uploadlimit <= 0) {
      console.log(`User ${user.address} isn't on whitelist`);
      console.log(user);
      removeFile(req.file.path);
      return false;
    }
  } catch (err) {
    console.log(err);
    removeFile(req.file.path);
    return false;
  }
  return true;
};

const uploadFile = async (req) => {
  console.log("uploadFile: Entered");
  if (!(await validateInput(req))) return false;
  console.log(req.file);
  const address = req.body.address.toLowerCase();

  // Rename file
  const fileDir = req.file.path.replace(req.file.filename, "");
  const newPath = fileDir + req.file.originalname;
  fs.renameSync(req.file.path, newPath);

  // Get metadata for all Estuary pins before file upload
  const pinsMetadataBefore = await estuaryWrapper.getPinsList();
  if (!pinsMetadataBefore) {
    console.log(`Failed to get pins for ${address}`);
    removeFile(req.file.path);
    return false;
  }

  // Upload file
  console.log(`Uploading ${req.file.originalname} to Estuary`);
  const file = fs.createReadStream(newPath);
  const success = await estuaryWrapper.uploadFile(file);
  removeFile(file.path);
  if (!success) {
    console.log(`Failed to upload ${req.file.originalname} to Estuary`);
    return false;
  }

  // Get metadata for all Estuary pins after file upload
  const pinsMetadataAfter = await estuaryWrapper.getPinsList();
  if (!pinsMetadataAfter) {
    console.log(`Failed to get pins for ${address}`);
    return false;
  }
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

  const fileMetadata = await dbWrapper.selectFile(["cid", "address"], [newPinMetadata["cid"], address]);
  if (fileMetadata) {
    console.log("User has already uploaded this file");
    // Delete from Estuary
    let numAttempts = 0;
    while (numAttempts < 5) {
      try {
        const resp = await axios.delete(`https://api.estuary.tech/pinning/pins/${newPinMetadata["requestid"]}`, {
          headers: {
            Authorization: "Bearer " + process.env.ESTUARY_API_KEY,
          },
        });
        break;
      } catch (err) {
        console.log(err);
        numAttempts++;
      }
    }
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
    const success = await uploadFile(req);
    if (success) {
      return res.status(200).json({
        data: `Successfully uploaded file ${req.file.originalname} for ${req.body.address}`,
      });
    }
    return res.status(400).json({ error: `An error ocurred` });
  },
};
