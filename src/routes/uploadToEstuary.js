const fse = require("fs-extra");
const express = require("express");
const router = express.Router();
const multer = require("multer");
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = `./estuaryUploads/${Date.now()}`;
    fse.ensureDir(dir, (err) => {
      if (err) {
        console.log(err);
        return cb(null, `./estuaryUploads/`);
      }
      return cb(null, dir);
    });
  },
});

const maxSize = 2 ** 20 * 500; // 2^20 == 1 MiB
const upload = multer({ storage: storage, limits: { fileSize: maxSize } });

const uploadToEstuaryService = require("../services/uploadToEstuary.service");

router.post("/", upload.array("data"), uploadToEstuaryService.uploadFiles);

module.exports = router;
