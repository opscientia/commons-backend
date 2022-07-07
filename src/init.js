const { MongoClient } = require("mongodb");
const NodeCache = require("node-cache");
require("dotenv").config();

const msgCache = new NodeCache({ stdTTL: 300, checkperiod: 100 });

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
