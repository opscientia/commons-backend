const express = require('express')
const dbWrapper = require('../utils/dbWrapper')

const setFileMetadata = async (req) => {
  console.log('setFileMetadata: Entered')
  if (!req.body.address || !req.body.cid || !req.body.filename) {
    return undefined;
  }
  if (req.body.address.length != 42 || req.body.address.substring(0, 2) != "0x") {
    return undefined
  }
  const address = req.body.address.toLowerCase()
  const cid = req.body.cid.toLowerCase()
  const filename = req.body.filename.toLowerCase()

  const file = await dbWrapper.selectFile('cid', cid)
  if (file) {
    console.log(`setFileMetadata: Updating row in files: address: ${address} cid: ${cid} filename: ${filename}`)
    dbWrapper.runSql(`UPDATE files SET address=?, filename=? WHERE cid=?`, [address, filename, cid])
  }
  else {
    console.log(`setFileMetadata: Inserting row into files: address: ${address} cid: ${cid} filename: ${filename}`)
    dbWrapper.runSql(`INSERT INTO files (address, cid, filename) VALUES (?, ?, ?)`, [address, cid, filename])
  }
  return true;
}

/**
 * Get file metadata for every file belonging to the specified address.
 * Examples:
 * curl -X GET http://localhost:3005/fileMetadata?address=0x0000000000000000000000000000000000000000
 */
const getFileMetadata = async (req) => {
  console.log('getFileMetadata: Entered')
  if (!req.query.address) {
    return undefined;
  }
  const address = req.query.address.toLowerCase()
  const files = await dbWrapper.getFilesByUserAddress(address)
  if (files) {
    console.log(files)
    console.log(`getFileMetadata: files.length == ${files.length}`)
    return files;
  }
  console.log(`getUploadLimit: Address ${address} has no files`)
}

module.exports = {
  getFileMetadata: async (req, res) => {
    if (req.get('Authorization') != `Basic ${process.env.AUTH_TOKEN}`) {
      return res.status(400).json({ error: "Incorrect Authorization header." })
    }
    const files = await getFileMetadata(req)
    if (files) {
      return res.status(200).json(files)
    }
    return res.status(400).json({ error: "No such file" })
  },
  setFileMetadata: async (req, res) => {
    if (req.get('Authorization') != `Basic ${process.env.AUTH_TOKEN}`) {
      return res.status(400).json({ error: "Incorrect Authorization header." })
    }
    const cid = req.body.cid;
    const address = req.body.address
    const filename = req.body.filename
    const success = await setFileMetadata(req)
    if (success) {
      return res.status(200).json({ data: `Successfully set file metadata for file: userAddress: ${address} cid: ${cid} filename: ${filename}` })
    }
    return res.status(400).json({ error: `An error ocurred trying to set file metadata for file: ` 
                                        + `userAddress: ${address} cid: ${cid} filename: ${filename}`})
  }
}
