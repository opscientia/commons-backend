const axios = require("axios");
const fs = require("fs");
const fsp = require("fs/promises")
const FormData = require("form-data");
const { packToFs } = require("ipfs-car/pack/fs");
const { FsBlockStore } = require("ipfs-car/blockstore/fs");
const utils = require("./utils");
const { TreewalkCarSplitter } = require("carbites/treewalk");
const { CarReader } = require("@ipld/car/reader");
const dagCbor = require("@ipld/dag-cbor");

const estuaryEndpoints = [
  "https://shuttle-4.estuary.tech/content/add",
  "https://api.estuary.tech/content/add",
];

module.exports.getPinsList = async () => {
  try {
    const resp = await axios.get("https://api.estuary.tech/pinning/pins", {
      headers: {
        Authorization: "Bearer " + process.env.ESTUARY_API_KEY,
      },
    });
    const pinMetadata = resp.data.results.map((item) => ({
      filename: item.pin.name,
      cid: item.pin.cid,
      estuaryId: item.estuaryId,
    }));
    return pinMetadata;
  } catch (err) {
    console.log(
      `estuaryWrapper.getPinsList: Error status: ${err.response?.status}. Error code: ${err.code}. Error message: ${err.message}`
    );
  }
  return undefined;
};

module.exports.uploadFile = async (file, maxAttempts = 3) => {
  const formData = new FormData();
  formData.append("data", file);

  let numAttempts = 0;
  while (numAttempts < maxAttempts) {
    try {
      // Get URL of shuttle node with most space
      const viewerResp = await axios.get("https://api.estuary.tech/viewer", {
        headers: {
          Authorization: "Bearer " + process.env.ESTUARY_API_KEY,
        },
      });
      console.log(viewerResp.data.settings.uploadEndpoints);

      const url = viewerResp.data.settings.uploadEndpoints[0];

      // Upload file
      const resp = await axios.post(url, formData, {
        headers: {
          Authorization: "Bearer " + process.env.ESTUARY_API_KEY,
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });
      return resp.data;
    } catch (err) {
      numAttempts++;
      console.log(
        `estuaryWrapper.uploadFile: Error status: ${err.response?.status}. Error code: ${err.code}. Error message: ${err.message}`
      );
    }
  }
};

module.exports.uploadFileAsCAR = async (file, maxAttempts = 3) => {
  const formData = new FormData();
  chunkie = new Buffer.from(file);

  formData.append("data", chunkie, "chunk");
  let numAttempts = 0;
  while (numAttempts < maxAttempts) {
    try {
      // Get URL of shuttle node with most space
      const viewerResp = await axios.get("https://api.estuary.tech/viewer", {
        headers: {
          Authorization: "Bearer " + process.env.ESTUARY_API_KEY,
        },
      });
      //const url = viewerResp.data.settings.uploadEndpoints[0];
      const url = "https://api.estuary.tech/content/add-car"
      console.log(url);
      // Upload file
      const resp = await axios.post(url, formData, {
        headers: {
          Authorization: "Bearer " + process.env.ESTUARY_API_KEY,
          "Content-Type": "application/octet-stream",
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });
      return resp.data;
    } catch (err) {
      numAttempts++;
      console.log(
        `estuaryWrapper.uploadFile: Error status: ${err.response?.status}. Error code: ${err.code}. Error message: ${err.message}`
      );
    }
  }
};

module.exports.deleteFile = async (requestid, maxAttempts = 3) => {
  let numAttempts = 0;
  while (numAttempts < maxAttempts) {
    try {
      const resp = await axios.delete(
        `https://api.estuary.tech/pinning/pins/${requestid}`,
        {
          headers: {
            Authorization: "Bearer " + process.env.ESTUARY_API_KEY,
          },
        }
      );

      `estuaryWrapper.deleteFile: Deleted file with requestid ${requestid}`
      );
      return true;
    } catch (err) {
      numAttempts++;
      console.log(
        `estuaryWrapper.deleteFile: Error status: ${err.response?.status}. Error code: ${err.code}. Error message: ${err.message}`
      );
    }
  }
};

/**
 * Pack directory at pathToDir into a CAR file and upload that CAR to Estuary.
 * @param pathToDir Path to directory to be packed and uploaded.
 * @param pathToCar (Optional) Destination for the generated CAR file.
 *                  This local file will be deleted after upload.
 * @returns Response of upload request to Estuary if request succeeds, undefined otherwise.
 */
module.exports.uploadDirAsCar = async (pathToDir, pathToCar) => {
  if (!pathToCar) pathToCar = `${pathToDir + Date.now()}.car`;
  try {
    const { root, filename: carFilename } = await packToFs({
      input: pathToDir,
      output: pathToCar,
      blockstore: new FsBlockStore(),
    });

    console.log(`Uploading ${carFilename} to Estuary`);
    const file = fs.createReadStream(carFilename);
    const uploadResp = await module.exports.uploadFileAsCAR(file, 3);

    await utils.removeFiles(pathToCar);
    if (!uploadResp) console.log(`Failed to upload ${carFilename} to Estuary`);
    return uploadResp;
  } catch (err) {
    console.log(err);
  }
};

module.exports.splitCars = async (largeCar) => {
  console.log("Chunking CAR File");
  try {
    const bigCar = await CarReader.fromIterable(fs.createReadStream(largeCar));
    const [rootCid] = await bigCar.getRoots();
    const MaxCarSize1MB = 100000000;
    let uploadResp = undefined;
    let chunkie;
    let cars = [];
    //const targetSize =  64 * 1024 //1024 * 1024 * 100 // chunk to ~100MB CARs or 64 KB

    if (largeCar.size <= MaxCarSize1MB) {
      cars.push(car);
    } else {
      // when size exceeds MaxCarSize1MB, split it into an AsyncIterable<Uint8Array>
      const splitter = new TreewalkCarSplitter(bigCar, MaxCarSize1MB);

      for await (const smallCar of splitter.cars()) {
        for await (const chunk of smallCar) {
          cars.push(chunk);
        }
      }
    }

    for await (const c of cars) {
      uploadResp = await module.exports.uploadFileAsCAR(c, 3);
    }

    return uploadResp;
  } catch (error) {
    console.error(error);
    return;
  }
};
