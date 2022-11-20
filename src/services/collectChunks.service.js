const express = require("express");
const { msgCache } = require("../init");
const ChunkedUpload = require("@rstcruzo/express-chunked-file-upload");

/**
 * This endpoint recieves chunks sent from client, we do this using
 * express-chunked-file-upload will receive each chunk save it in a /tmp directory and then,
 * when finished uploading all chunks,
 * it will merge all the chunks and save the original file in the final destination.
 */
module.exports = {
  collectChunks: async (req, res) => {
    console.log(`${new Date().toISOString()} collectChunks: entered`);

    const chunkedUpload = new ChunkedUpload({ filePath: "chunks/" });

    app.post("/", chunkedUpload.makeMiddleware(), (req, res) => {
        res.send({ filePart: req.filePart, isLastPart: req.isLastPart });

    });
    express.use((err, req, res, next) => {
        if (err) {
            res.status(500)
               .send(util.format('Internal server error: %s', err.message));
        }
    });
  
    
  },
};
