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
const upload = multer({ storage: storage });

const uploadToEstuaryService = require("../services/uploadToEstuary.service");

router.post("/", upload.array("data"), uploadToEstuaryService.uploadFiles);

module.exports = router;
