const { MongoClient, ServerApiVersion } = require("mongodb");
const NodeCache = require("node-cache");
require("dotenv").config();

const msgCache = new NodeCache({ stdTTL: 300, checkperiod: 100 });

//const url = process.env.MONGO_DB_URL;

const url =
  "mongodb+srv://doadmin:5o43W6K792B8zmYE@data-pipeline-db-main-d6d2bab9.mongo.ondigitalocean.com/admin?tls=true&authSource=admin&replicaSet=data-pipeline-db-main&tlsCAFile=/home/torch/Desktop/Work/OpSci/commons-backend/ca-certificate.crt";
const mongoClient = new MongoClient(url, {
  useUnifiedTopology: false,
});
try {
  mongoClient.connect().then(() => console.log("Connected to database server"));
  process.on("SIGTERM", async () => await mongoClient.close());
} catch (error) {
  console.log(error);
}

module.exports = {
  mongoClient: mongoClient,
  msgCache: msgCache,
};
