import { MongoClient } from 'mongodb';
import NodeCache from 'node-cache';
import * as dotenv from 'dotenv';
require("dotenv").config();

const msgCache = new NodeCache({ stdTTL: 300, checkperiod: 100 });
let mongoClient: MongoClient;
if (!process.env.MONGO_DB_URL) {
  process.exit(1);
}
const url = process.env.MONGO_DB_URL;
  mongoClient = new MongoClient(url);
  mongoClient.connect().then(() => console.log("Connected to database server"));
process.on("SIGTERM", async () => await mongoClient.close());

export {
  mongoClient,
  msgCache,
};
