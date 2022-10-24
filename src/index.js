const express = require("express");
const cors = require("cors");
const passportSetup = require("./utils/passport-setup");
const cookiesSession = require("cookie-session");
const metadata = require("./routes/metadata");
const uploadToEstuary = require("./routes/uploadToEstuary");
const initializeUpload = require("./routes/initializeUpload");
const orcidOauth = require("./routes/orcid-oauth");
const profileRoutes = require('./routes/userProfile');
const req = require("express/lib/request");
const passport = require("passport");

const app = express();

const corsOptions = {
  // origin: ["https://commons.opsci.io"],
  origin: true,
};

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors(corsOptions));

app.use(cookiesSession(
  {
    maxAge: 24 * 60 * 60 * 1000,
    keys: [process.env.COOKIE_SECRET]
  }
));
app.use(passport.initialize())
app.use(passport.session())

app.use("/metadata", metadata);
app.use("/uploadToEstuary", uploadToEstuary);
app.use("/initializeUpload", initializeUpload);
app.use("/auth", orcidOauth);
app.use("/profile", profileRoutes);


module.exports = app;
