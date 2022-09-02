import * as fse from 'fs-extra';
import * as express from 'express';
import multer from 'multer';
import uploadToEstuaryService from '../services/uploadToEstuaryService';

export default function UploadToEstuary() {
  const router = express.Router();
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
  const maxSize = 2 ** 20 * 500; // 2^20 == 1 MiB
  const upload = multer({ storage: storage, limits: { fileSize: maxSize } });
  
  
  router.post("/", upload.array("data"), uploadToEstuaryService.uploadFiles);
}
