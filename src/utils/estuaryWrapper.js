const axios = require("axios");
const FormData = require("form-data");

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
      requestid: item.requestid,
    }));
    return pinMetadata;
  } catch (err) {
    console.log(err);
  }
  return undefined;
};

module.exports.uploadFile = async (file, maxAttempts) => {
  if (!maxAttempts) maxAttempts = 1;

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
      return true;
    } catch (err) {
      numAttempts++;
      console.log(`Code: ${err.code}. Message: ${err.message}`);
    }
  }
  return false;
};
