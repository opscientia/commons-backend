const express = require("express");
const cors = require("cors");

const metadata = require("./routes/metadata");
const uploadToEstuary = require("./routes/uploadToEstuary");
const initializeUpload = require("./routes/initializeUpload");

const app = express();

const corsOptions = {
  // origin: ["https://commons.opsci.io"],
  origin: true,
};

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors(corsOptions));

app.use("/metadata", metadata);
app.use("/uploadToEstuary", uploadToEstuary);
app.use("/initializeUpload", initializeUpload);

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

module.exports = app;
