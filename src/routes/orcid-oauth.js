const router = require("express").Router();
const orcidAuthService = require("../services/orcidAuth.service");
//auth login screen
router.get("/login", orcidAuthService.onLogin);

// auth logout
router.get("/logout", orcidAuthService.onLogout);

//auth with orcid
router.get("/orcid", orcidAuthService.onAuthClick);

// handle oauth redirect
router.get("/orcid/redirect", orcidAuthService.onAuthRedirect);

module.exports = router;
