const express = require("express");
const axios = require("axios");
const fse = require("fs-extra");
const web3 = require("web3");
const { ethers } = require("ethers");
const { packToFs } = require("ipfs-car/pack/fs");
const { FsBlockStore } = require("ipfs-car/blockstore/fs");
const { unpackToFs } = require("ipfs-car/unpack/fs");
const dbWrapper = require("../utils/dbWrapper");
const estuaryWrapper = require("../utils/estuaryWrapper");
const utils = require("../utils/utils");
const { fetchJson } = require("ethers/lib/utils");

/**
 * Get file metadata for every file belonging to the specified address.
 * (Does not require authentication. Only modifications to a user's files require authentication.)
 * Examples:
 * curl -X GET http://localhost:3005/fileMetadata?address=0x0000000000000000000000000000000000000000
 */
const getFileMetadata = async (req) => {
  if (!req.query.address) {
    return undefined;
  }
  const address = req.query.address.toLowerCase();
  const files = await dbWrapper.getFilesByUserAddress(address);
  if (files) {
    return files;
  }
};

/**
 * Delete file by address && requestid && (optionally) path.
 * If path is specified, only the file designated by path is deleted. If path is not specified,
 * the entire CAR file designated by requestid is deleted.
 * Example:
 * curl -X DELETE http://localhost:3005/fileMetadata?address=address=0x0000000000000000000000000000000000000000&requestid=123
 */
const deleteFileMetadata = async (req) => {
  console.log("deleteFileMetadata: Entered");
  if (!req.query.address || !req.query.requestid || !req.query.signature) {
    return false;
  }
  if (req.query.address.length != 42 || req.query.address.substring(0, 2) != "0x") {
    return false;
  }
  const address = req.query.address.toLowerCase();
  const requestid = parseInt(req.query.requestid);
  const path = req.query.path;
  const signature = req.query.signature;

  // Ensure signer == address == address associated with this requestid
  let strToSign = `/fileMetadata?address=${req.query.address}&requestid=${requestid}`;
  if (path) strToSign += `&path=${path}`;
  const hashedStr = web3.utils.sha3(strToSign);
  let signer;
  try {
    signer = (await ethers.utils.recoverAddress(hashedStr, signature)).toLowerCase();
  } catch (err) {
    console.log(err);
    console.log("deleteFileMetadata: malformed signature");
    return false;
  }
  if (signer != address) {
    console.log("deleteFileMetadata: signer != address");
    console.log(`deleteFileMetadata: signer:  ${signer}`);
    console.log(`deleteFileMetadata: address: ${address}`);
    return false;
  }
  // If the user isn't deleting the whole directory, delete only the file designated by path.
  if (path) {
    const file = await dbWrapper.selectFile(["requestid", "path", "address"], [requestid, path, address]);
    if (!file) return false;
    try {
      // Get and unpack CAR
      const fileDest = `estuaryUploads/${file.carcid + Date.now()}.car`;
      const unpackedCarDest = fileDest.slice(0, -4);
      await utils.downloadFile(`https://ipfs.io/ipfs/${file.carcid}`, fileDest);
      await unpackToFs({ input: fileDest, output: unpackedCarDest });
      // Delete file designated by path
      await fse.remove(`${unpackedCarDest}/${path}`);
      // Pack back into CAR and upload updated CAR
      const uploadResp = await estuaryWrapper.uploadDirAsCar(unpackedCarDest, fileDest);
      const newUploadCid = uploadResp.cid;
      const newUploadRequestId = uploadResp.estuaryId;
      await utils.removeFiles(unpackedCarDest);
      await estuaryWrapper.deleteFile(requestid, 3);
      // Remove deleted file from db. Do this after re-upload so that db is only updated after successful upload
      let params = [address, path, requestid];
      console.log(`deleteFileMetadata: Deleting row in files that has the following address, path, and requestid: ${params}`);
      dbWrapper.runSql(`DELETE FROM files WHERE address=? AND path=? AND requestid=?`, params);
      // Update carcid and requestid for every file in the updated CAR
      const columns = "carcid=?, requestid=?";
      params = [newUploadCid, newUploadRequestId, file.carcid, address];
      console.log(`deleteFileMetadata: Updating row in files with columns: ${columns} and params: ${params}`);
      await dbWrapper.runSql(`UPDATE files SET ${columns} WHERE carcid=? AND address=?`, params);
      return true;
    } catch (err) {
      console.log(err);
      return false;
    }
  } else {
    const file = await dbWrapper.selectFile(["requestid", "address"], [requestid, address]);
    if (!file) return false;
    const params = [address, requestid];
    console.log(`deleteFileMetadata: Deleting row in files that has the following address and requestid: ${params}`);
    dbWrapper.runSql(`DELETE FROM files WHERE address=? AND requestid=?`, params);
    return await estuaryWrapper.deleteFile(requestid, 5);
  }
};

// TODO: Either delete this or only allow the filename to be changed. requestid should NOT be changed.
// const setFileMetadata = async (req) => {
//   console.log("setFileMetadata: Entered");
//   if (!req.body.address || !req.body.cid || !req.body.filename || !req.body.requestid) {
//     return undefined;
//   }
//   if (req.body.address.length != 42 || req.body.address.substring(0, 2) != "0x") {
//     return undefined;
//   }
//   const address = req.body.address.toLowerCase();
//   const cid = req.body.cid.toLowerCase();
//   const requestid = parseInt(req.body.requestid);
//   const filename = req.body.filename.toLowerCase();

//   const file = await dbWrapper.selectFile(["cid"], [cid]);
//   if (file) {
//     const columns = "address=?, filename=?, requestid=?";
//     const params = [address, filename, requestid, cid];
//     console.log(`setFileMetadata: Updating row in files: columns: ${columns} params: ${params}`);
//     dbWrapper.runSql(`UPDATE files SET ${columns} WHERE cid=?`, params);
//   } else {
//     const columns = "(address, filename, cid, requestid)";
//     const params = [address, filename, cid, requestid];
//     console.log(`setFileMetadata: Inserting row into files: columns: ${columns} params: ${params}`);
//     dbWrapper.runSql(`INSERT INTO files ${columns} VALUES (?, ?, ?, ?)`, params);
//   }
//   return true;
// };

module.exports = {
  getFileMetadata: async (req, res) => {
    const files = await getFileMetadata(req);
    if (files) return res.status(200).json(files);
    return res.status(400).json({ error: "No files for the specified address" });
  },
  deleteFileMetadata: async (req, res) => {
    const success = await deleteFileMetadata(req);
    if (success) {
      return res.status(200).json({ data: `Successfully deleted file metadata for file: ${req.body.filename}` });
    }
    return res.status(400).json({ error: `An error ocurred trying to set file metadata for file: ${req.body.filename}` });
  },
  // setFileMetadata: async (req, res) => {
  //   if (req.get("Authorization") != `Basic ${process.env.AUTH_TOKEN}`) {
  //     return res.status(403).json({ error: "Incorrect Authorization header." });
  //   }
  //   const newRow = {
  //     address: req.body.address,
  //     filename: req.body.filename,
  //     cid: req.body.cid,
  //     requestid: req.body.requestid,
  //   };
  //   const success = await setFileMetadata(req);
  //   if (success) {
  //     return res.status(200).json({
  //       data: {
  //         message: `Successfully set file metadata for file: ${req.body.filename}`,
  //         newFileMetadata: newRow,
  //       },
  //     });
  //   }
  //   return res.status(400).json({ error: `An error ocurred trying to set file metadata for file: ${req.body.filename}` });
  // },
};
