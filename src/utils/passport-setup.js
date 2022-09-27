const passport = require("passport");
const OrcidStrategy = require("passport-orcid").Strategy;
const orcidKeys = require("./keys");
const { createUser, getUser } = require("./db-auth-handler");
passport.use(
  new OrcidStrategy(
    {
      sandbox: true, // remove this to use the production API
      state: false, // remove this if not using sessions
      clientID: process.env.ORCID_CLIENT_ID,
      clientSecret: process.env.ORCID_CLIENT_SECRET,
      callbackURL: "/auth/orcid/redirect",
    },
    (accessToken, refreshToken, params, profile, done) => {
      // `profile` is empty as ORCID has no generic profile URL,
      // so populate the profile object from the params instead
      profile = { orcid: params.orcid, name: params.name };

      getUser({ orcid: profile.orcid }).then((currentUser) => {
        if (currentUser) {
          // User already exists, log their info
          console.log("User is:" + currentUser);
        } else {
          createUser(profile).then((newUser) => {
            console.log("New User Created:" + newUser);
          });
        }
      });

      // return done(null, profile);
    }
  )
);
