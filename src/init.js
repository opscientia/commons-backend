const sqlite3 = require("sqlite3").verbose();
const { MongoClient } = require("mongodb");
const NodeCache = require("node-cache");
require("dotenv").config();

const msgCache = new NodeCache({ stdTTL: 300, checkperiod: 100 });

let database = null;
if (process.env.USE_TEST_DB == "true") {
  database = new sqlite3.Database(`${__dirname}/../database/test.sqlite3`);
  console.log("Using test database");
} else {
  database = new sqlite3.Database(`${__dirname}/../database/prod.sqlite3`);
  console.log("Using production database");
}
const db = database;
process.on("SIGTERM", () => db.close());
db.serialize(() => {
  let columns = "(address TEXT, uploadlimit INTEGER)"; // uploadlimit == upload limit in GB
  db.prepare(`CREATE TABLE IF NOT EXISTS users ${columns}`).run().finalize();

  // address == user's crypto address. carcid == CID of the CAR file into which this file was packed
  columns = "(address TEXT, filename TEXT, path TEXT, carcid TEXT, requestid INTEGER)";
  db.prepare(`CREATE TABLE IF NOT EXISTS files ${columns}`).run().finalize();
});

let url = `mongodb+srv://${process.env.MONGO_DB_USERNAME}:${process.env.MONGO_DB_PASSWORD}`;
url += `@cluster0.gwjmf6s.mongodb.net/test?retryWrites=true&w=majority&useNewUrlParser=true&useUnifiedTopology=true`;
const mongoClient = new MongoClient(url);
mongoClient.connect().then(() => console.log("Connected to database server"));
process.on("SIGTERM", async () => await mongoClient.close());

module.exports = {
  // db: db,
  mongoClient: mongoClient,
  msgCache: msgCache,
};
