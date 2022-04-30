const express = require('express')
const dbWrapper = require('../utils/dbWrapper')

/**
 * Delete file by address && requestid.
 * Example:
 * curl -X DELETE http://localhost:3005/fileMetadata?address=address=0x0000000000000000000000000000000000000000&requestid=123
 */
const deleteFileMetadata = async (req) => {
  console.log('deleteFileMetadata: Entered')
  if (!req.query.address || typeof req.query.requestid !== "number") {
    return undefined
  }
  if (req.query.address.length != 42 || req.query.address.substring(0, 2) != "0x") {
    return undefined
  }
  const address = req.query.address.toLowerCase()
  const requestid = parseInt(req.query.requestid)

  const filesBelongingToUser = await dbWrapper.getFilesByUserAddress(address)
  const hasFile = filesBelongingToUser.filter(file => file.requestid == requestid).length > 0
  const file = await dbWrapper.selectFile('requestid', requestid)
  if (hasFile && file) {
    const params = [address, requestid]
    console.log(`deleteFileMetadata: Deleting row in files that has the following address and requestid: ${params}`)
    dbWrapper.runSql(`DELETE FROM files WHERE address=? AND requestid=?`, params)
    let success = true
    fetch(`https://api.estuary.tech/pinning/pins/${requestid}`, {
      method: 'DELETE',
      headers: {
        Authorization: 'Bearer ' + process.env.ESTUARY_API_KEY,
      }
    })
      .then(data => {
        return data.json();
      })
      .then(data => {
        console.log(`deleteFileMetadata: Successfully submit delete request to Estuary for file with requestid ${requestid}`)
        success = true
      })
      .catch(err => {
        console.log(err)
        console.log(`deleteFileMetadata: Failed to submit delete request to Estuary for file with requestid ${requestid}`)
        success = false
      })
    return success
  }
  return false
}

const setFileMetadata = async (req) => {
  console.log('setFileMetadata: Entered')
  if (!req.body.address || !req.body.cid || !req.body.filename || typeof req.body.requestid !== "number") {
    return undefined
  }
  if (req.body.address.length != 42 || req.body.address.substring(0, 2) != "0x") {
    return undefined
  }
  const address = req.body.address.toLowerCase()
  const cid = req.body.cid.toLowerCase()
  const requestid = parseInt(req.body.requestid)
  const filename = req.body.filename.toLowerCase()

  const file = await dbWrapper.selectFile('cid', cid)
  if (file) {
    const columns = 'address=?, filename=?, requestid=?'
    const params = [address, filename, requestid, cid]
    console.log(`setFileMetadata: Updating row in files: columns: ${columns} params: ${params}`)
    dbWrapper.runSql(`UPDATE files SET ${columns} WHERE cid=?`, params)
  }
  else {
    const columns = '(address, filename, cid, requestid)'
    const params = [address, filename, cid, requestid]
    console.log(`setFileMetadata: Inserting row into files: columns: ${columns} params: ${params}`)
    dbWrapper.runSql(`INSERT INTO files ${columns} VALUES (?, ?, ?, ?)`, params)
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
      return res.status(403).json({ error: "Incorrect Authorization header." })
    }
    const files = await getFileMetadata(req)
    if (files) {
      return res.status(200).json(files)
    }
    return res.status(400).json({ error: "No such file" })
  },
  setFileMetadata: async (req, res) => {
    if (req.get('Authorization') != `Basic ${process.env.AUTH_TOKEN}`) {
      return res.status(403).json({ error: "Incorrect Authorization header." })
    }
    const newRow = {
      address: req.body.address, 
      filename: req.body.filename, 
      cid: req.body.cid, 
      requestid: req.body.requestid
    }
    const success = await setFileMetadata(req)
    if (success) {
      return res.status(200).json({ data: {
        message: `Successfully set file metadata for file: ${req.body.filename}`,
        newFileMetadata: newRow
      }})
    }
    return res.status(400).json({ error: `An error ocurred trying to set file metadata for file: ${req.body.filename}`})
  },
  deleteFileMetadata: async (req, res) => {
    if (req.get('Authorization') != `Basic ${process.env.AUTH_TOKEN}`) {
      return res.status(403).json({ error: "Incorrect Authorization header." })
    }
    const success = await deleteFileMetadata(req)
    if (success) {
      return res.status(200).json({ data: `Successfully deleted file metadata for file: ${req.body.filename}` })
    }
    return res.status(400).json({ error: `An error ocurred trying to set file metadata for file: ${req.body.filename}`})
  }
}
