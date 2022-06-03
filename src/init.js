const sqlite3 = require("sqlite3").verbose();
require("dotenv").config();

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

module.exports = {
  db: db,
};
