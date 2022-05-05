const express = require('express')
const cors = require('cors')

const userUploadLimit = require('./routes/userUploadLimit')
const fileMetadata = require('./routes/fileMetadata')
const uploadToEstuary = require('./routes/uploadToEstuary')

const app = express()

app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(cors())

app.use('/userUploadLimit', userUploadLimit)
app.use('/fileMetadata', fileMetadata)
app.use('/uploadToEstuary', uploadToEstuary)

module.exports = app