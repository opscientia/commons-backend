import { Express } from "express";
import cors from 'cors';
import Metadata from "./routes/metadata";
import UploadToEstuary from "./routes/uploadToEstuary";
import InitializeUpload from "./routes/initializeUpload";


const app = express();

const corsOptions = {
  // origin: ["https://commons.opsci.io"],
  origin: true,
};

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors(corsOptions));

app.use("/metadata", Metadata);
app.use("/uploadToEstuary", UploadToEstuary);
app.use("/initializeUpload", InitializeUpload);

module.exports = app;
