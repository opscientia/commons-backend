import fs from 'fs';
import fse from 'fs-extra';
import axios from 'axios';
import Web3 from 'web3';
import { ethers } from 'ethers';
import { SignatureLike } from '@ethersproject/bytes';

module.exports.removeFiles = async (pathToFiles: string) => {
  if (pathToFiles == "estuaryUploads/") return;
  try {
    await fse.remove(pathToFiles);
    console.log(`Removed ${pathToFiles}`);
  } catch (err) {
    console.error(err);
  }
};

// h.t. https://gist.github.com/senthilmpro/072f5e69bdef4baffc8442c7e696f4eb
module.exports.downloadFile = async (url: string, outputPath: fs.PathLike) => {
  // download with response type "stream"
  const response = await axios.get(url, { responseType: "stream" });
  // pipe the result stream into a file on disc
  response.data.pipe(fs.createWriteStream(outputPath));
  // return a promise and resolve when download finishes
  return new Promise((resolve, reject) => {
    response.data.on("end", () => {
      resolve();
    });
    response.data.on("error", () => {
      reject();
    });
  });
};

module.exports.assertSignerIsAddress = async (message: any, signature: SignatureLike, address: string) => {
  if (!signature || !address) return false;
  const msgHash = web3.utils.sha3(message);
  let signer;
  try {
    signer = ethers.utils.recoverAddress(msgHash, signature).toLowerCase();
  } catch (err) {
    console.log(err);
    console.log("Malformed signature");
  }
  return signer.toLowerCase() == address.toLowerCase();
};
