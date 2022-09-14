import { Router } from "express";
import initializeUpload  from '../services/initializeUploadService';

export default function InitializeUpload () {
    const router = Router();

    router.get("/", initializeUpload);
};


