# Commons Backend Server

This server handles the backend logic for OpSci Commons. It exposes a REST API to the Commons frontend and serves as a proxy between Commons' decentralized storage (Estuary) and Commons' metadata database.

Its purposes are:

- Authenticate file upload/delete requests using Holo.
- Forward file uploads/delete requests to Estuary.
- Handle logic for storing and retrieving metadata of datasets stored on Commons (see [metadata-schema](#metadata-schema)).

## Endpoints

### **POST** `/metadata/datasets/publish?address=<address>&signature=<signature>&datasetId=<datasetId>`

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

### **GET** `/metadata/datasets/published?id=<_id>`

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

### **GET** `/metadata/datasets?address=<address>`

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

### **GET** `/metadata/files?address=<address>`

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

### **DELETE** `/metadata/files?address=<address>&signature=<signature>&estuaryId=<estuaryId>`

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

### **GET** `/initializeUpload?address=<address>`

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

### **POST** `/uploadToEstuary`

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
                modality: string[]
                tasks: string[]
                warnings: string
                errors: string
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
