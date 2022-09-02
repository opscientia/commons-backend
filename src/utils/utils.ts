import fs from "fs";
import fse from "fs-extra";
import axios from "axios";
import Web3 from "web3";
import { ethers } from "ethers";
import { SignatureLike } from "@ethersproject/bytes";

async function removeFiles(pathToFiles: string) {
  if (pathToFiles == "estuaryUploads/") return;
  try {
    await fse.remove(pathToFiles);
    console.log(`Removed ${pathToFiles}`);
  } catch (err) {
    console.error(err);
  }
}

// h.t. https://gist.github.com/senthilmpro/072f5e69bdef4baffc8442c7e696f4eb
async function downloadFile(url: string, outputPath: fs.PathLike) {
  // download with response type "stream"
  const response = await axios.get(url, { responseType: "stream" });
  // pipe the result stream into a file on disc
  response.data.pipe(fs.createWriteStream(outputPath));
  // return a promise and resolve when download finishes
  return new Promise<void>((resolve, reject) => {
    response.data.on("end", () => {
      resolve();
    });
    response.data.on("error", () => {
      reject();
    });
  });
}

async function assertSignerIsAddress(
  message: any,
  signature: SignatureLike,
  address: string
): Promise<any> {
  if (!signature || !address) return false;
  const msgHash = Web3.utils.sha3(message);
  let signer = "0x0000000000000000000000000000000000000000";
  try {
    if (msgHash) {
      signer = ethers.utils.recoverAddress(msgHash, signature).toLowerCase();
    }
  } catch (err) {
    console.log(err);
    console.log("Malformed signature");
  }
  return signer.toLowerCase() == address.toLowerCase();
}
export default { assertSignerIsAddress, downloadFile, removeFiles };
