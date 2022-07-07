# Commons Backend Server

This server handles the backend logic for OpSci Commons. It exposes a REST API to the Commons frontend and serves as a proxy between Commons' decentralized storage (Estuary) and Commons' metadata database.

Its purposes are:

- Authenticate file upload/delete requests using Holo.
- Forward file uploads/delete requests to Estuary.
- Handle logic for storing and retrieving metadata of datasets stored on Commons (see [metadata-schema](#metadata-schema)).

## Endpoints

### **GET** `/fileMetadata?address=<address>`

Get metadata for all datasets uploaded by user with the specified address. Returns an array of metadata items for every file in every dataset uploaded by the user.

- Parameters

  | name      | description                   | type   | in    | required |
  | --------- | ----------------------------- | ------ | ----- | -------- |
  | `address` | Uploader of files of interest | string | query | true     |

- Example

  ```bash
  curl -X GET 'https://localhost:3005/fileMetadata/address=0x0000000000000000000000000000000000000000'
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

### **DELETE** `/fileMetadata?address=<address>&signature=<signature>&estuaryId=<estuaryId>`

Delete all the file designated by estuaryId from Estuary, and delete all metadata associated with the file's children (if the file is an archive of a directory). The user must provide a signature of the string `/fileMetadata?address=<address>&estuaryId=<estuaryId>`.

- Parameters

  | name        | description                               | type   | in    | required |
  | ----------- | ----------------------------------------- | ------ | ----- | -------- |
  | `address`   | The uploader's blockchain address         | string | query | true     |
  | `signature` | Cryptographic signature from the uploader | string | query | true     |
  | `estuaryId` | The Estuary ID of the file to delete      | string | query | true     |

- Example

  ```bash
  curl -X GET 'https://localhost:3005/fileMetadata/address=0x0000000000000000000000000000000000000000'
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
      formData.append('data', files)
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

### **GET** `/getDatasetDescription?estuaryId=<estuaryId>`

Get the dataset description contained in the dataset_description.json file at the root of the CAR file specified by \<estuaryId>. If the file designated by \<estuaryId> is not a CAR file or does not contain dataset_description.json at the root, then the request will fail.

- Parameters

  | name        | description                             | type   | in    | required |
  | ----------- | --------------------------------------- | ------ | ----- | -------- |
  | `estuaryId` | The ID given to the CAR file by Estuary | string | query | true     |

- Responses

  - 200

    - Successful request. Dataset description is returned as JSON.

  - 400
    - description: An error occurred
    - response:
      ```JSON
      { }
      ```

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
        chunkIds: number[]
    }

    chunk: {
        // id: number // MongoDB creates an _id field upon insertion
        datasetId: number // id of parent dataset
        path: string
        doi: string
        storageIds: {cid: -cid-, estuaryId: -estuaryId-} // estuaryId == Estuary's requestid
        fileIds: number[] // array of commonsFileIds
        size: number
    }

    commonsFile: {
        // id: number // MongoDB creates an _id field upon insertion
        chunkId: number // id of parent chunk
        name: string
        path: string
        size: number
        documentation: string
    }
