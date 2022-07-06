# Commons Proxy Server

This server handles authentication and stores metadata for OpSci Commons.

## Metadata Schema

    dataset: {
        // id: number // MongoDB creates an _id field upon insertion
        title: string
        description: string
        authors: string[]
        uploader: string // blockchain address
        license: string
        doi: string
        keywords: string[]
        published: boolean
        size: number
        chunks: number[] // array of chunkIds
    }

    chunk: {
        // id: number // MongoDB creates an _id field upon insertion
        datasetId: number // id of parent dataset
        path: string
        doi: string
        storageIds: {cid: -cid-, estuaryId: -estuaryId-}
        files: number[] // array of commonsFileIds
        size: number
        standard: {
            BIDS: {
                validated: boolean
                version: string
                deidentified: boolean
                modality: string[]
                tasks: string[]
                warnings: string
                errors: string
            }
            STANDARD2: {
            }
        }
    }

    commonsFile: {
        // id: number // MongoDB creates an _id field upon insertion
        chunkId: number // id of parent chunk
        name: string
        path: string
        size: number
        documentation: string
    }
