const express = require("express");
const axios = require("axios");
const fs = require("fs");
const fse = require("fs-extra");
const FormData = require("form-data");
const web3 = require("web3");
const { ethers } = require("ethers");
const { packToFs } = require("ipfs-car/pack/fs");
const { FsBlockStore } = require("ipfs-car/blockstore/fs");
const dbWrapper = require("../utils/dbWrapper");
const estuaryWrapper = require("../utils/estuaryWrapper");

const removeFiles = async (pathToFiles) => {
  if (pathToFiles == "estuaryUploads/") return;
  try {
    await fse.remove(pathToFiles);
    console.log(`Removed ${pathToFiles}`);
  } catch (err) {
    console.error(err);
  }

  // The following is equivalen to "rm -rf path/to/files"
  // fsPromises.rm(pathToFiles, { recursive: true, force: true });
  // console.log(`Removed ${pathToFiles}`);

  // fs.unlink(pathToFiles, (err) => {
  //   if (err) throw err;
  //   console.log(`Removed ${pathToFiles}`);
  // });
};

// Validate input for uploadFile()
const validateInput = async (req) => {
  if (!req.body.address || !req.files || !req.body.signature) {
    console.log("Missing argument");
    await removeFiles(req.files[0].destination);
    return false;
  }
  if (req.body.address.length != 42 || req.body.address.substring(0, 2) != "0x") {
    console.log("Invalid address");
    await removeFiles(req.files[0].destination);
    return false;
  }
  const address = req.body.address.toLowerCase();
  const fileAsString = fs.readFileSync(req.files[0].path, "utf8");
  const fileHash = web3.utils.sha3(fileAsString);
  const signer = (await ethers.utils.recoverAddress(fileHash, req.body.signature)).toLowerCase();
  if (signer != address) {
    console.log("signer != address");
    console.log(`signer:  ${signer}`);
    console.log(`address: ${address}`);
    await removeFiles(req.files[0].destination);
    return false;
  }
  try {
    const user = await dbWrapper.getUserByAddress(address);
    if (user.uploadlimit <= 0) {
      console.log(`User ${user.address} isn't on whitelist`);
      console.log(user);
      await removeFiles(req.files[0].destination);
      return false;
    }
  } catch (err) {
    console.log(err);
    await removeFiles(req.files[0].destination);
    return false;
  }
  return true;
};

const uploadFiles = async (req) => {
  console.log("uploadFile: Entered");
  if (!(await validateInput(req))) return false;
  console.log(req.files);

  // Move uploaded files into correct folders
  const uniqueFolder = req.files[0].destination;
  for (const file of req.files) {
    const userDefinedPath = req.body[file.originalname].startsWith("/")
      ? req.body[file.originalname].substring(1)
      : req.body[file.originalname];
    if (!userDefinedPath.includes("/")) {
      continue;
    }
    const newLocalFilePath = uniqueFolder + "/" + userDefinedPath;

    try {
      await fse.move(file.path, newLocalFilePath);
    } catch (err) {
      console.log(err);
      return;
    }
  }

  // TODO: const carName = uniqueFolder.numChildDirs == 1 ? uniqueFolder.childDir : '${req.files[0].filename + "0"}.car'
  const { root, filename: carFilename } = await packToFs({
    input: uniqueFolder,
    output: `${uniqueFolder}/${req.files[0].filename + "0"}.car`,
    blockstore: new FsBlockStore(),
  });

  const address = req.body.address.toLowerCase();
  const path = req.body.path; // path of uploaded folder from root (this is used by the frontend)

  // Get metadata for all Estuary pins before file upload
  const pinsMetadataBefore = await estuaryWrapper.getPinsList();
  if (!pinsMetadataBefore) {
    console.log(`Failed to get pins for ${address}`);
    await removeFiles(uniqueFolder);
    return false;
  }

  // Upload file
  console.log(`Uploading ${carFilename} to Estuary`);
  const file = fs.createReadStream(carFilename);
  const uploadSuccess = await estuaryWrapper.uploadFile(file, 3);
  await removeFiles(uniqueFolder);
  if (!uploadSuccess) {
    console.log(`Failed to upload ${carFilename} to Estuary`);
    return false;
  }

  // Get metadata for all Estuary pins after file upload
  const pinsMetadataAfter = await estuaryWrapper.getPinsList();
  if (!pinsMetadataAfter) {
    console.log(`Failed to get pins for ${address}`);
    return false;
  }
  const newPinsMetadata = pinsMetadataAfter.filter(
    ({ requestid: rid1 }) => !pinsMetadataBefore.some(({ requestid: rid2 }) => rid1 == rid2)
  );
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
    const columns = "(address, filename, path, cid, requestid)";
    const params = [address, newPinMetadata["filename"], path, newPinMetadata["cid"], newPinMetadata["requestid"]];
    console.log(`uploadFile: Inserting row into files: columns: ${columns} params: ${params}`);
    dbWrapper.runSql(`INSERT INTO files ${columns} VALUES (?, ?, ?, ?, ?)`, params);
  }
  return true;
};

module.exports = {
  uploadFiles: async (req, res) => {
    const success = await uploadFiles(req);
    if (success) {
      return res.status(200).json({
        data: `Successfully uploaded file(s) for ${req.body.address}`,
      });
    }
    return res.status(400).json({ error: `An error ocurred` });
  },
};
