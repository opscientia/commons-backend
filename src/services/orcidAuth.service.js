const passport = require("passport");

//auth login screen
router.get("/login");

const onLogin = async (req, res) => {
  // handle with passport
  const message = ` User Login Sucessfull`;
  return res.status(200).json({ message: message });
};

const onLogout = async (req, res) => {
  //handle with passport
  res.send("logging out");
};

//auth with orcid
const onAuthClick = async (req, res) => {
  try {
    passport.authenticate("orcid", {
      scope: ["/authenticate"],
    });
    const message = `Passport Authentication Triggered`;
    return res.status(200).json({ message: message });
  } catch (error) {
    console.error(error);
  }
  const message = `Passport Authentication Failed`;
  return res.status(500).json({ error: message });
};

// handle oauth redirect
const onAuthRedirect = async (req, res) => {
  try {
    passport.authenticate("orcid", () => {
      console.log(" Hiii user, You've reached callback redirect");
    });
    const message = `Passport Authentication Redirect Triggered`;
    return res.status(200).json({ message: message });
  } catch (error) {
    console.error(error);
  }
  const message = `Passport Authentication Redirect Failed`;
  return res.status(500).json({ error: message });
};

module.exports = {
  onLogin,
  onLogout,
  onAuthClick,
  onAuthRedirect,
};
