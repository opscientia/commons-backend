const passport = require("passport");

// show auth login screen in frontend, if unnecessary remove this route
const onLogin = async (req, res) => {
  // render login screen
  const message = `Display Login Screen`;
  return res.status(200).json({ user: req.user, message: message });
};

const onLogout = async (req, res) => {
  req.logout();
  return res.redirect('/');
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
    //return res.status(200).json(req.user);
    return res.redirect('/profile');
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
