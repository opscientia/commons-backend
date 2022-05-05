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
};

module.exports.uploadFile = async (file) => {
  let success = false;
  const formData = new FormData();
  formData.append("data", file);
  try {
    const resp = await axios.post("https://shuttle-4.estuary.tech/content/add", formData, {
      headers: {
        Authorization: "Bearer " + process.env.ESTUARY_API_KEY,
      },
    });
    success = true;
  } catch (err) {
    success = false;
    console.log(`Code: ${err.code}. Message: ${err.message}`);
  }
  return success;
};
