const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");
const { packToFs } = require("ipfs-car/pack/fs");
const { FsBlockStore } = require("ipfs-car/blockstore/fs");
const utils = require("./utils");

const estuaryEndpoints = ["https://shuttle-4.estuary.tech/content/add", "https://api.estuary.tech/content/add"];

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
    console.log(`estuaryWrapper.getPinsList: Response status: ${resp.status}. Error code: ${err.code}. Error message: ${err.message}`);
  }
  return undefined;
};

module.exports.uploadFile = async (file, maxAttempts = 3) => {
  const formData = new FormData();
  formData.append("data", file);

  let numAttempts = 0;
  while (numAttempts < maxAttempts) {
    try {
      const resp = await axios.post("https://shuttle-4.estuary.tech/content/add", formData, {
        headers: {
          Authorization: "Bearer " + process.env.ESTUARY_API_KEY,
        },
      });
      return resp.data;
    } catch (err) {
      numAttempts++;
      console.log(`estuaryWrapper.uploadFile: Response status: ${resp.status}. Error code: ${err.code}. Error message: ${err.message}`);
    }
  }
};

module.exports.deleteFile = async (requestid, maxAttempts = 3) => {
  let numAttempts = 0;
  while (numAttempts < maxAttempts) {
    try {
      const resp = await axios.delete(`https://api.estuary.tech/pinning/pins/${requestid}`, {
        headers: {
          Authorization: "Bearer " + process.env.ESTUARY_API_KEY,
        },
      });
      console.log(`estuaryWrapper.deleteFile: Deleted file with requestid ${requestid}`);
      return true;
    } catch (err) {
      numAttempts++;
      console.log(`estuaryWrapper.deleteFile: Response status: ${resp.status}. Error code: ${err.code}. Error message: ${err.message}`);
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
