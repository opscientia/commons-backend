export interface  Dataset {
    _id?: any; // MongoDB ObjectId object
    title?: string;
    description?: string;
    authors?: any[]; // MongoDB ObjectId object // pointers to author objects
    uploader?: string; // blockchain address
    license?: string;
    doi?: string;
    keywords?: string[];
    published?: boolean;
    size: number;
    standard: {
        bids: {
            validated?: boolean;
            version?: string;
            deidentified?: boolean;
            modalities: string[];
            tasks: string[];
            warnings: string[];
            errors: string[];
            
        };
        STANDARD2?: {
        };
    }
    miscellaneous?: any;
    chunkIds?: any[]; // array of MongoDB ObjectId objects
}

export interface Chunk {
    _id?: any; // MongoDB ObjectId object
    datasetId?: any; // id of parent dataset // MongoDB ObjectId object
    path?: string;
    doi?: string;
    storageIds?: {cid: string, estuaryId: any};
    fileIds?: any[]; // array of commonsFileIds // array of MongoDB ObjectId objects
    size?: number;
}

export interface CommonsFile {
    _id: any; // MongoDB ObjectId object
    chunkId: any; // id of parent chunk // MongoDB ObjectId object
    name: string;
    path: string;
    size: number;
    documentation: string;
}
// ToDo: Make ORCID, Email, and Blockchain address as required fields when implemented
export interface Author {
    _id: any // MongoDB ObjectId object
    name: string
    orcid?: string
    email?: string
    blockchainAddress?: string
}