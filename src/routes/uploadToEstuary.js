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

// const upload = multer({ dest: `estuaryUploads/${Date.now()}` });
const maxSize = 2 ** 30; // 2^30 == 1 GiB
const upload = multer({ storage: storage, limits: { fileSize: maxSize } });

const uploadToEstuaryService = require("../services/uploadToEstuary.service");

router.post("/", upload.array("data"), uploadToEstuaryService.uploadFiles);

module.exports = router;
