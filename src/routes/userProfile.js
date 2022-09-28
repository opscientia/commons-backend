const router = require("express").Router();
const { authCheck, onProfilePage } = require("../services/userProile.service");

router.get("/", authCheck, onProfilePage);

module.exports = router;
