import * as express from "express";
import { initializeUpload } from '../services/initializeUploadService';

export default function InitializeUpload () {
    const router = express.Router();

    router.get("/", initializeUpload.initializeUpload);
}


