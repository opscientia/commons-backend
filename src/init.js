const { MongoClient } = require("mongodb");
const NodeCache = require("node-cache");
require("dotenv").config();

const msgCache = new NodeCache({ stdTTL: 300, checkperiod: 100 });

const url = process.env.MONGO_DB_URL;
const mongoClient = new MongoClient(url);
mongoClient.connect().then(() => console.log("Connected to database server"));
process.on("SIGTERM", async () => await mongoClient.close());

module.exports = {
  // db: db,
  mongoClient: mongoClient,
  msgCache: msgCache,
};
