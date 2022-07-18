# Commons Backend Server

This server handles the backend logic for OpSci Commons. It exposes a REST API to the Commons frontend and serves as a proxy between Commons' decentralized storage (Estuary) and Commons' metadata database.

Its purposes are:

- Authenticate file upload/delete requests using Holo.
- Forward file uploads/delete requests to Estuary.
- Handle logic for storing and retrieving metadata of datasets stored on Commons (see the [metadata schema](#metadata-schema)).

## Contents

- [Endpoints](#endpoints)
- [Architecture](#architecture)
- [Metadata Schema](#metadata-schema)

## Endpoints {#endpoints}

- **GET** [`/metadata/datasets/`](#metadata-datasets)
- **GET** [`/metadata/datasets/published/`](#metadata-datasets-published)
- **GET** [`/metadata/datasets/published/search/`](#metadata-datasets-published-search)
- **POST** [`/metadata/datasets/publish/`](#metadata-datasets-publish)
- **GET** [`/metadata/chunks/published/`](#metadata-chunks-published)
- **GET** [`/metadata/files/`](#metadata-files)
- **DELETE** [`/metadata/files/`](#metadata-files-delete)
- **GET** [`/initializeUpload/`](#initialize-upload)
- **POST** [`/uploadToEstuary/`](#upload)

### **GET** `/metadata/datasets?address=<address>` {#metadata-datasets}

Get metadata for all datasets uploaded by user with the specified address. Returns an array of metadata items for every file in every dataset uploaded by the user.

- Parameters

  | name      | description                      | type   | in    | required |
  | --------- | -------------------------------- | ------ | ----- | -------- |
  | `address` | Uploader of datasets of interest | string | query | true     |

- Example

  ```bash
  curl -X GET 'https://localhost:3005/metadata/datasets/address=0x0000000000000000000000000000000000000000'
  ```

- Responses

  - 200

    - Successfully retrieved file metadata
    - Example response:
      ```JSON
      [
        {
            "_id": new ObjectId("62c8662757a389a8fbd645e9"),
            "title": "Example Title",
            "description": "Example description",
            "authors": ["Author 1", "Author 2"],
            "uploader": "0x0000000000000000000000000000000000000000", // blockchain address
            "license": "MIT",
            "doi": "123",
            "keywords": ["Keyword 1", "Keyword 2"],
            "published": false,
            "size": 10,
            "standard": {
                "bids": {
                    "validated": true,
                    "version": "1.9.0",
                    "deidentified": true,
                    "modality": [],
                    "tasks": [],
                    "warnings": "",
                    "errors": ""
                }
            },
            "miscellaneous": { "partOf": "DANDI" },
            "chunkIds": [new ObjectId("62c8662757a389a8fbd645ea")] // array of MongoDB ObjectId objects
        },
        {
            ...
        }
      ]
      ```

  - 400
    - description: An error occurred, or there are no datasets for the specified address
    - response:
      ```JSON
      { "error": "No datasets for the specified address" }
      ```

### **GET** `/metadata/datasets/published?id=<_id>` {#metadata-datasets-published}

Get the dataset with the specified ID. If the dataset has not been published, an error is returned.

If no "id" parameter is found in the query, all published datasets are returned.

- Parameters

  | name | description                           | type   | in    | required |
  | ---- | ------------------------------------- | ------ | ----- | -------- |
  | `id` | \_id of the desired published dataset | string | query | false    |

- Example

  ```bash
  curl -X GET 'https://localhost:3005/metadata/datasets/published?id=62c8662757a389a8fbd645e9'
  ```

- Responses

  - 200

    - Successfully retrieved dataset metadata with specified id
    - Example response (where id is specified):

      ```JSON

        {
            "_id": new ObjectId("62c8662757a389a8fbd645e9"),
            "title": "Example Title",
            "description": "Example description",
            "authors": ["Author 1", "Author 2"],
            "uploader": "0x0000000000000000000000000000000000000000", // blockchain address
            "license": "MIT",
            "doi": "123",
            "keywords": ["Keyword 1", "Keyword 2"],
            "published": false,
            "size": 10,
            "standard": {
                "bids": {
                    "validated": true,
                    "version": "1.9.0",
                    "deidentified": true,
                    "modality": [],
                    "tasks": [],
                    "warnings": "",
                    "errors": ""
                }
            },
            "miscellaneous": { "partOf": "DANDI" },
            "chunkIds": [new ObjectId("62c8662757a389a8fbd645ea")] // array of MongoDB ObjectId objects
        },

      ```

      - Example response (where id is NOT specified):

      ```JSON
        [
            {
                "_id": new ObjectId("62c8662757a389a8fbd645e9"),
                "title": "Example Title",
                "description": "Example description",
                "authors": ["Author 1", "Author 2"],
                "uploader": "0x0000000000000000000000000000000000000000", // blockchain address
                "license": "MIT",
                "doi": "123",
                "keywords": ["Keyword 1", "Keyword 2"],
                "published": false,
                "size": 10,
                "standard": {
                    "bids": {
                        "validated": true,
                        "version": "1.9.0",
                        "deidentified": true,
                        "modality": [],
                        "tasks": [],
                        "warnings": "",
                        "errors": ""
                    }
                },
                "miscellaneous": { "partOf": "DANDI" },
                "chunkIds": [new ObjectId("62c8662757a389a8fbd645ea")] // array of MongoDB ObjectId objects
            },
            {
                ...
            }
        ]
      ```

  - 400
    - description: An error occurred, or there are no datasets with the specified id
    - response:
      ```JSON
      { "error": "No published datasets have the specified id" }
      ```

### **GET** `/metadata/datasets/published/search?searchStr=<searchStr>` {#metadata-datasets-published-search}

Search published datasets.

- Parameters

  | name        | description  | type   | in    | required |
  | ----------- | ------------ | ------ | ----- | -------- |
  | `searchStr` | Query string | string | query | false    |

- Example

  ```bash
  curl -X GET 'https://localhost:3005/metadata/datasets/published/search?searchStr=BIDS'
  ```

- Responses

  - 200

    - Successfully retrieved metadata for datasets matching search string
    - Example response:
      ```JSON
        [
            {
                "_id": new ObjectId("62c8662757a389a8fbd645e9"),
                "title": "Example Title",
                "description": "Example description",
                "authors": ["Author 1", "Author 2"],
                "uploader": "0x0000000000000000000000000000000000000000", // blockchain address
                "license": "MIT",
                "doi": "123",
                "keywords": ["Keyword 1", "Keyword 2"],
                "published": false,
                "size": 10,
                "standard": {
                    "bids": {
                        "validated": true,
                        "version": "1.9.0",
                        "deidentified": true,
                        "modality": [],
                        "tasks": [],
                        "warnings": "",
                        "errors": ""
                    }
                },
                "miscellaneous": { "partOf": "DANDI" },
                "chunkIds": [new ObjectId("62c8662757a389a8fbd645ea")] // array of MongoDB ObjectId objects
            },
            {
                ...
            }
        ]
      ```

  - 404

    - description: Search yielded no results.
    - response:
      ```JSON
      { "error": "No published datasets found" }
      ```

  - 400
    - description: searchStr was not provided, or an error occurred.

### **POST** `/metadata/datasets/publish?address=<address>&signature=<signature>&datasetId=<datasetId>` {#metadata-datasets-publish}

Publish the dataset designated by datasetId. The requestor must also provide their address and their signature of the concatenation of address (as string) and datasetId (as string), i.e., sign(\<address>\<datasetId>). The address must match the address of the signer.

- Parameters

  | name          | description                        | type   | in   | required |
  | ------------- | ---------------------------------- | ------ | ---- | -------- |
  | `address`     | Uploader of the dataset to publish | string | body | true     |
  | `signature`   | Signature from uploader            | string | body | true     |
  | `datasetId`   | \_id of dataset to publish         | string | body | true     |
  | `title`       | Title of dataset to publish        | string | body | true     |
  | `description` | Description of dataset to publish  | string | body | true     |
  | `authors`     | Author(s) of dataset to publish    | string | body | true     |
  | `keywords`    | Keywords of dataset to publish     | string | body | false    |

- Example

  ```bash
  curl -X GET 'https://localhost:3005/metadata/datasets/address=0x0000000000000000000000000000000000000000&signature=0x...123&datasetId=62c8662757a389a8fbd645e9'
  ```

- Responses

  - 200

    - Successfully retrieved file metadata
    - Example response:
      ```JSON
      [
        {
            "_id": new ObjectId("62c8662757a389a8fbd645e9"),
            "title": "Example Title",
            "description": "Example description",
            "authors": ["Author 1", "Author 2"],
            "uploader": "0x0000000000000000000000000000000000000000", // blockchain address
            "license": "MIT",
            "doi": "123",
            "keywords": ["Keyword 1", "Keyword 2"],
            "published": false,
            "size": 10,
            "standard": {
                "bids": {
                    "validated": true,
                    "version": "1.9.0",
                    "deidentified": true,
                    "modality": [],
                    "tasks": [],
                    "warnings": "",
                    "errors": ""
                }
            },
            "miscellaneous": { "partOf": "DANDI" },
            "chunkIds": [new ObjectId("62c8662757a389a8fbd645ea")] // array of MongoDB ObjectId objects
        },
        {
            ...
        }
      ]
      ```

  - 400
    - description: An error occurred, or there are no datasets for the specified address
    - response:
      ```JSON
      { "error": "No datasets for the specified address" }
      ```

### **GET** `/metadata/chunks/published?datasetId=<datasetId>` {#metadata-chunks-published}

Get chunks by datasetId.

- Parameters

  | name        | description                    | type   | in    | required |
  | ----------- | ------------------------------ | ------ | ----- | -------- |
  | `datasetId` | \_id of chunk's parent dataset | string | query | true     |

- Example

  ```bash
  curl -X GET 'https://localhost:3005/metadata/chunks/published/?datasetId=62c8662757a389a8fbd645e9'
  ```

- Responses

  - 200

    - Successfully retrieved metadata for chunks belonging to the specified dataset
    - Example response:
      ```JSON
        [
            {
                "_id": new ObjectId("62c8662757a389a8fbd645fa"),
                "datasetId": new ObjectId("62c8662757a389a8fbd645e9"),
                "path": "/",
                "doi": "",
                "storageIds": {"cid": "0x123...", "estuaryId": 5555},
                "fileIds": ["62c8662757a389a8fbd64513",...],
                "size": 100
            }
            {
                ...
            }
        ]
      ```

  - 404

    - description: No chunks are children of the specified dataset.
    - response:
      ```JSON
      { "error": "Found no chunks whose parent dataset is 62c8662757a389a8fbd645e9" }
      ```

  - 400
    - description: datasetId was not provided, or an error occurred.

### **GET** `/metadata/files?address=<address>` {#metadata-files}

Get metadata for all files uploaded by user with the specified address. Returns an array of metadata items for every file in every file uploaded by the user.

- Parameters

  | name      | description                   | type   | in    | required |
  | --------- | ----------------------------- | ------ | ----- | -------- |
  | `address` | Uploader of files of interest | string | query | true     |

- Example

  ```bash
  curl -X GET 'https://localhost:3005/metadata/files/address=0x0000000000000000000000000000000000000000'
  ```

- Responses

  - 200

    - Successfully retrieved file metadata
    - Example response:
      ```JSON
      [
        {
            "chunkId": "1", // id of parent chunk
            "name": "fileName",
            "path": "dir1/dir2",
            "size": 2,
            "documentation": "",
        },
        {
            ...
        }
      ]
      ```

  - 400
    - description: An error occurred, or there are no files for the specified address
    - response:
      ```JSON
      { "error": "No files for the specified address" }
      ```

### **DELETE** `/metadata/files?address=<address>&signature=<signature>&estuaryId=<estuaryId>` {#metadata-files-delete}

Delete all the file designated by estuaryId from Estuary, and delete all metadata associated with the file's children (if the file is an archive of a directory). The user must provide a signature of the string `/metadata/files?address=<address>&estuaryId=<estuaryId>`.

- Parameters

  | name        | description                               | type   | in    | required |
  | ----------- | ----------------------------------------- | ------ | ----- | -------- |
  | `address`   | The uploader's blockchain address         | string | query | true     |
  | `signature` | Cryptographic signature from the uploader | string | query | true     |
  | `estuaryId` | The Estuary ID of the file to delete      | string | query | true     |

- Example

  ```bash
  curl -X GET 'https://localhost:3005/metadata/files/address=0x0000000000000000000000000000000000000000'
  ```

- Responses

  - 200

    - Successfully retrieved file metadata
    - Example response:
      ```JSON
      [
        {
            "chunkId": "1", // id of parent chunk
            "name": "fileName",
            "path": "dir1/dir2",
            "size": 2,
            "documentation": "",
        },
        {
            ...
        }
      ]
      ```

  - 400
    - description: An error occurred, or there are no files for the specified address
    - response:
      ```JSON
      { "error": "No files for the specified address" }
      ```

### **GET** `/initializeUpload?address=<address>` {#initialize-upload}

Initialize an upload interaction. This endpoint returns a message which the user must sign in order to upload.

- Parameters

  | name      | description                   | type   | in    | required |
  | --------- | ----------------------------- | ------ | ----- | -------- |
  | `address` | The user's blockchain address | string | query | true     |

- Responses

  - 200

    - Example response:
      ```JSON
      { "message": "123random" }
      ```

  - 400
    - Description: An error occurred
    - Example response:
      ```JSON
      { "error": "No address found in query string. Please specify address." }
      ```

### **POST** `/uploadToEstuary` {#upload}

Upload files to Estuary. Before uploading, the user must get a nonce from /initializeUpload and sign it with their private key. The resulting signature must be included in the request body. This is used for authentication.

- Parameters

  | name         | description                               | type   | in   | required |
  | ------------ | ----------------------------------------- | ------ | ---- | -------- |
  | `address`    | The uploader's blockchain address         | string | body | true     |
  | `signature`  | Cryptographic signature from the uploader | string | body | true     |
  | `data`       | Files to upload (uploaded as FormData)    | string | body | true     |
  | `<filename>` | \<filepath>                               | string | body | true     |

- Example

  ```JavaScript
    const formData = new FormData()
    formData.append('address', address)
    formData.append('signature', signature)
    for (const file of files) {
      formData.append('data', file)
      formData.append(file.name, file.path)
    }
    try {
      const resp = await fetch(
        `http://localhost:3005/uploadToEstuary`,
        {
          method: 'POST',
          body: formData
        }
      )
    } catch (err) {}
  ```

- Responses

  - 200

    - Example response:
      ```JSON
      {
        "data": "Successfully uploaded file(s) for 0x0000000000000000000000000000000000000000",
      }
      ```

  - 400
    - description: An error occurred, or the request was unauthorized
    - response:
      ```JSON
      { "error": "An error ocurred" }
      ```

## Architecture {#architecture}

At a high level, there are 4 components of OpSci Commons:

- Frontend (user interface)
- Backend server
- Metadata database
- Estuary (which uses IPFS & Filecoin)

**Frontend.** This is where users upload, publish, search, and download datasets.

**Backend server.** This server handles access control logic and acts as a proxy between the frontend and the other two components.

**Metadata database.** Stores dataset metadata according to the [metadata schema](#metadata-schema). Note: This database could be a MongoDB cluster, an on-chain smart contract, or something else.

**Estuary.** An open source service run by Protocol Labs that allows developers to easily upload to IPFS and Filecoin. (Check it out [here](https://estuary.tech/).) It is used by OpSci Commons to store extremely large datasets.

### Architecture Diagrams

![Upload Dataset](https://www.websequencediagrams.com/cgi-bin/cdraw?lz=dGl0bGUgT3BTY2kgQ29tbW9ucyBVcGxvYWQKCkZyb250ZW5kLT5CYWNrZW5kIFNlcnZlcjogUmVxdWVzdCBzZWNyZXQKABEOLT4AMQg6IFNlbmQAHggANRoAawYgZGF0YXNldCAod2l0aCBzaWduZQA1CCkAUxFFc3R1YXJ5AC0QCgARBwCBIBR0dXJuIENJRCBhbmQgZQA6BklkAIEtEU1ldGFkYXRhAIFlCUluc2VydACBFgltABkHAIFcGwBlBwAhEQoK&s=default)

![Publish Dataset](https://www.websequencediagrams.com/cgi-bin/cdraw?lz=dGl0bGUgT3BTY2kgQ29tbW9ucyBQdWJsaXNoCgpGcm9udGVuZC0-QmFja2VuZCBTZXJ2ZXI6ABsIIGRhdGFzZXQKABIOLT5NZXRhZGF0YSBEYXRhYmFzZToAIwgucABYBmVkID0gdHJ1ZQoK&s=default)

![Search Datasets](https://www.websequencediagrams.com/cgi-bin/cdraw?lz=dGl0bGUgT3BTY2kgQ29tbW9ucyBTZWFyY2gKCkZyb250ZW5kLT5CYWNrZW5kIFNlcnZlcjogUXVlcnkKAAgOLT5NZXRhZGF0YSBEYXRhYmFzZQAhCAAIEQA7FyByZXN1bHRzAEkRAIECCAAYEAoK&s=default)

![Delete Dataset](https://www.websequencediagrams.com/cgi-bin/cdraw?lz=dGl0bGUgT3BTY2kgQ29tbW9ucyBEZWxldGUKCgpGcm9udGVuZC0-QmFja2VuZCBTZXJ2ZXI6ABwHIGRhdGFzZXQKABEOLT5NZXRhZGF0YQAZFyBtABkHACgRRXN0dWFyeQBQEQo&s=default)

## Metadata Schema

    dataset: {
        _id: any // MongoDB ObjectId object
        title: string
        description: string
        authors: any[] // MongoDB ObjectId object // pointers to author objects
        uploader: string // blockchain address
        license: string
        doi: string
        keywords: string[]
        published: boolean
        size: number
        standard: {
            bids: {
                validated: boolean
                version: string
                deidentified: boolean
                modalities: string[]
                tasks: string[]
                warnings: string[]
                errors: string[]
            }
            STANDARD2: {
            }
        }
        miscellaneous: any
        chunkIds: any[] // array of MongoDB ObjectId objects
    }

    chunk: {
        _id: any // MongoDB ObjectId object
        datasetId: any // id of parent dataset // MongoDB ObjectId object
        path: string
        doi: string
        storageIds: {cid: -cid-, estuaryId: -estuaryId-}
        fileIds: any[] // array of commonsFileIds // array of MongoDB ObjectId objects
        size: number
    }

    commonsFile: {
        _id: any // MongoDB ObjectId object
        chunkId: any // id of parent chunk // MongoDB ObjectId object
        name: string
        path: string
        size: number
        documentation: string
    }

    author: {
        _id: any // MongoDB ObjectId object
        name: string
        orcid: string
        email: string
        blockchainAddress: string
    }
