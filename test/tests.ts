import { expect } from 'chai';
import axios from "axios";
require("dotenv").config();

describe("userUploadLimit/", function () {
  before( () => {
    this.address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  });

  it("Should correctly update the upload limit for a user", async function () {
    const firstUploadLimit = 0;
    let url = `http://localhost:3005/userUploadLimit`;
    let data = { address: this.address, limit: firstUploadLimit };
    let response = await axios.post(url, data, {
      headers: { Authorization: `Basic ${process.env.AUTH_TOKEN}` },
    });
    console.log(await response.data);
    expect(response.status).to.equal(200);

    url = `http://localhost:3005/userUploadLimit?address=${this.address}`;
    response = await axios.get(url, {
      headers: { Authorization: `Basic ${process.env.AUTH_TOKEN}` },
    });
    let uploadLimit = parseInt(await response.data);
    expect(uploadLimit).to.equal(firstUploadLimit);

    const newUploadLimit = 2;
    url = `http://localhost:3005/userUploadLimit`;
    data = { address: this.address, limit: newUploadLimit };
    response = await axios.post(url, data, {
      headers: { Authorization: `Basic ${process.env.AUTH_TOKEN}` },
    });
    expect(response.status).to.equal(200);

    url = `http://localhost:3005/userUploadLimit?address=${this.address}`;
    response = await axios.get(url, {
      headers: { Authorization: `Basic ${process.env.AUTH_TOKEN}` },
    });
    uploadLimit = parseInt(await response.data);
    expect(uploadLimit).to.equal(newUploadLimit);
  });
});
