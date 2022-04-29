const express = require('express')
const router = express.Router()

const uploadLimitService = require('../services/userUploadLimit.service')

router.get('/', uploadLimitService.getUploadLimit)
router.post('/', uploadLimitService.setUploadLimit)

module.exports = router