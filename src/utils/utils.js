const fs = require("fs");
const fse = require("fs-extra");
const axios = require("axios");
const web3 = require("web3");
const { ethers } = require("ethers");

module.exports.removeFiles = async (pathToFiles) => {
  if (pathToFiles == "estuaryUploads/") return;
  try {
    await fse.remove(pathToFiles);
    console.log(`Removed ${pathToFiles}`);
  } catch (err) {
    console.error(err);
  }
};

// h.t. https://gist.github.com/senthilmpro/072f5e69bdef4baffc8442c7e696f4eb
module.exports.downloadFile = async (url, outputPath) => {
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

module.exports.assertSignerIsAddress = async (message, signature, address) => {
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
