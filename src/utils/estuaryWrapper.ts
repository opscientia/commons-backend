import axios from "axios";
import fs from "fs";
import utils from "./utils";
import FormData from "form-data";
import { packToFs } from "ipfs-car/pack/fs";
import { FsBlockStore } from "ipfs-car/blockstore/fs";

const estuaryEndpoints = [
  "https://shuttle-4.estuary.tech/content/add",
  "https://api.estuary.tech/content/add",
];

async function getPinsList() {
  try {
    const resp = await axios.get("https://api.estuary.tech/pinning/pins", {
      headers: {
        Authorization: "Bearer " + process.env.ESTUARY_API_KEY,
      },
    });
    const pinMetadata = resp.data.results.map(
      (item: { pin: { name: any; cid: any }; estuaryId: any }) => ({
        filename: item.pin.name,
        cid: item.pin.cid,
        estuaryId: item.estuaryId,
      })
    );
    return pinMetadata;
  } catch (err: any) {
    if (err) {
      console.error(
        `estuaryWrapper.getPinsList: Error status: ${err.response?.status}. Error code: ${err.code}. Error message: ${err.message}`
      );
    }
  }
  return undefined;
}

async function uploadFile(file: any, maxAttempts: number) {
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
    } catch (err: any) {
      if (err) {
        numAttempts++;
        console.error(
          `estuaryWrapper.uploadFile: Error status: ${err.response?.status}. Error code: ${err.code}. Error message: ${err.message}`
        );
      }
    }
  }
}

async function deleteFile(requestid: any, maxAttempts: number): Promise<boolean> {
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
    } catch (err: any) {
      if (err) {
        numAttempts++;
        console.error(
          `estuaryWrapper.deleteFile: Error status: ${err.response?.status}. Error code: ${err.code}. Error message: ${err.message}`
        );
      }
    }
  }
  return false;
}

/**
 * Pack directory at pathToDir into a CAR file and upload that CAR to Estuary.
 * @param pathToDir Path to directory to be packed and uploaded.
 * @param pathToCar (Optional) Destination for the generated CAR file.
 *                  This local file will be deleted after upload.
 * @returns Response of upload request to Estuary if request succeeds, undefined otherwise.
 */
async function uploadDirAsCar(pathToDir: string, pathToCar: string) {
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
  } catch (err: any) {
    console.error(err);
  }
}

export default { uploadDirAsCar, deleteFile, uploadFile, getPinsList };
