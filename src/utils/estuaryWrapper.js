const axios = require("axios");
const fs = require("fs");
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
      console.log(
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
    const uploadResp = await module.exports.uploadFile(file, 3);

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
    let cars = [];
    //const targetSize =  64 * 1024 //1024 * 1024 * 100 // chunk to ~100MB CARs or 64 KB
    const splitter = new TreewalkCarSplitter(bigCar, MaxCarSize1MB);
    let uploadResp;
    for await (const car of splitter.cars()) {
      // Each `car` is an AsyncIterable<Uint8Array>
      const reader = await CarReader.fromIterable(car);
      const [splitCarRootCid] = await reader.getRoots();
      console.assert(rootCid.equals(splitCarRootCid));
      for await (const chunk of smallCar) {
        let chunkie = fs.createReadStream(chunk);

        uploadResp = await module.exports.uploadFile(chunkie, 3);

        // all cars will have the same root
        cars.push(chunk);
      }
    }
    return uploadResp;
  } catch (error) {
    console.error(error);
    return;
  }
};
