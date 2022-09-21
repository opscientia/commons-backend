const { msgCache } = require("../init");

/**
 * This endpoint generates a random message that the user can sign.
 * The uploadToEstuary/ endpoint needs to know this string in order
 * to verify the user's signature.
 */
module.exports = {
  initializeUpload: async (req, res) => {
    console.log(`${new Date().toISOString()} initializeUpload: entered`);
    if (!req.query.address) {
      return res.status(400).json({ error: `No address found in query string. Please specify address.` });
    }
    if (req.query.address.length != 42 || req.query.address.substring(0, 2) != "0x") {
      return res.status(400).json({ error: `Address invalid. Address must be 42 characters long and must start with '0x'` });
    }
    const address = req.query.address.toLowerCase();
    const randStr = Math.random().toString(16).substring(7);
    msgCache.set(address, randStr);
    return res.status(200).json({ message: randStr });
  },
};
