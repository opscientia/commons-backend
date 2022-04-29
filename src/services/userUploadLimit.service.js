const express = require('express')
const dbWrapper = require('../utils/dbWrapper')

const setUploadLimit = async (req) => {
  console.log('setUploadLimit: Entered')
  if (!req.body.address || !(req.body.limit || req.body.limit >= 0)) {
    return undefined;
  }
  if (req.body.address.length != 42 || req.body.address.substring(0, 2) != "0x") {
    return undefined
  }
  const address = req.body.address.toLowerCase()
  const limit = parseInt(req.body.limit)

  const user = await dbWrapper.getUserByAddress(address)
  console.log(`setUploadLimit: Giving ${address} an upload limit of ${limit} GB`)
  if (user) {
    dbWrapper.runSql(`UPDATE users SET uploadlimit=? WHERE address=?`, [limit, address])
  }
  else {
    dbWrapper.runSql(`INSERT INTO users (address, uploadlimit) VALUES (?, ?)`, [address, limit])
  }
  return true;
}

const getUploadLimit = async (req) => {
  console.log('getUploadLimit: Entered')
  if (!req.query.address) {
    return undefined;
  }
  const address = req.query.address.toLowerCase()
  const user = await dbWrapper.getUserByAddress(address)
  if (user) {
    console.log(`getUploadLimit: user.uploadlimit == ${user.uploadlimit}`)
    return user.uploadlimit;
  }
  console.log(`getUploadLimit: No user found with address ${address}`)
}

module.exports = {
  getUploadLimit: async (req, res) => {
    if (req.get('Authorization') != `Basic ${process.env.AUTH_TOKEN}`) {
      console.log(req.get('Authorization'))
      return res.status(403).json({ error: "Incorrect Authorization header." })
    }
    const uploadLimit = await getUploadLimit(req)
    if (typeof uploadLimit === "number") {
      return res.status(200).json(uploadLimit.toString())
    }
    return res.status(400).json({ error: "No user with the specified address." })
  },
  setUploadLimit: async (req, res) => {
    console.log(req.body)
    console.log(req.get('Authorization'))
    if (req.get('Authorization') != `Basic ${process.env.AUTH_TOKEN}`) {
      return res.status(403).json({ error: "Incorrect Authorization header." })
    }
    const success = await setUploadLimit(req)
    if (success) {
      return res.status(200).json({ data: `Successfully set user ${req.body.address}'s upload limit to ${req.body.limit}` })
    }
    return res.status(400).json({ error: `An error ocurred trying to set user ${req.body.address}'s upload limit to ${req.body.limit}`})
  }
}
