const express = require("express");
const axios = require("axios");
const web3 = require("web3");
const { ethers } = require("ethers");
const dbWrapper = require("../utils/dbWrapper");

/**
 * Get file metadata for every file belonging to the specified address.
 * (Does not require authentication. Only modifications to a user's files require authentication.)
 * Examples:
 * curl -X GET http://localhost:3005/fileMetadata?address=0x0000000000000000000000000000000000000000
 */
const getFileMetadata = async (req) => {
  console.log("getFileMetadata: Entered");
  if (!req.query.address) {
    return undefined;
  }
  const address = req.query.address.toLowerCase();
  console.log(`address == ${address}`);
  const files = await dbWrapper.getFilesByUserAddress(address);
  if (files) {
    console.log(`getFileMetadata: files.length == ${files.length}`);
    return files;
  }
  console.log(`getFileMetadata: Address ${address} has no files`);
};

/**
 * Delete file by address && requestid.
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
  const signature = req.query.signature;

  // Ensure signer == address == address associated with this requestid
  const strToSign = `/fileMetadata?address=${req.query.address}&requestid=${requestid}`;
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
  const file = await dbWrapper.selectFile(["requestid", "address"], [requestid, address]);
  if (file) {
    const params = [address, requestid];
    console.log(`deleteFileMetadata: Deleting row in files that has the following address and requestid: ${params}`);
    dbWrapper.runSql(`DELETE FROM files WHERE address=? AND requestid=?`, params);
    let success = true;
    let numAttempts = 0;
    while (numAttempts < 5) {
      try {
        const resp = await axios.delete(`https://api.estuary.tech/pinning/pins/${requestid}`, {
          headers: {
            Authorization: "Bearer " + process.env.ESTUARY_API_KEY,
          },
        });
        const data = resp.data;
        console.log(`deleteFileMetadata: Successfully submitted delete request to Estuary for file with requestid ${requestid}`);
        break;
      } catch (err) {
        console.log(err);
        console.log(`deleteFileMetadata: Failed to submit delete request to Estuary for file with requestid ${requestid}`);
        success = false;
        numAttempts++;
      }
    }
    return success;
  }
  return false;
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
