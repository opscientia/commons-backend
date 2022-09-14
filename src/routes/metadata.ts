import { Router } from "express";

import metadataService from "../services/metadataService" ;

export default function Metadata (){
    const router = Router();

    router.get("/datasets/", metadataService.getDatasetMetadata);
    router.get("/datasets/published", metadataService.getPublishedDatasets);
    router.get("/datasets/published/byUploader", metadataService.getPublishedDatasetsByUploader);
    router.get("/datasets/published/search", metadataService.searchPublishedDatasets);
    router.post("/datasets/publish", metadataService.publishDataset);
    router.get("/chunks/published", metadataService.getPublishedChunksByDatasetId);
    router.get("/files/", metadataService.getFileMetadata);
    router.delete("/files/", metadataService.deleteFileMetadata);
    router.get("/authors/", metadataService.getAuthorsByDatasetId);
};


