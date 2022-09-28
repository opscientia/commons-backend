const passport = require("passport");
const OrcidStrategy = require("passport-orcid").Strategy;
const dbAuthHandler = require("./db-auth-handler");
const mongodb = require("mongodb");

passport.serializeUser(function (user, done) {
    done(null, user.id)
  });

passport.deserializeUser(function (id, done) {
    const query = { _id: mongodb.ObjectId(req.query.userId)};
    dbAuthHandler.getUser(query).then((user) => {
        done(null, user.id)
    }
    );
  })


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

      dbAuthHandler.getUser({ orcid: profile.orcid }).then((currentUser) => {
        if (currentUser) {
          // User already exists, log their info
          console.log("User is:" + currentUser);
            done(null, currentUser);
        } else {
          dbAuthHandler.createUser(profile).then((newUser) => {
            console.log("New User Created:" + newUser);
            done(null, newUser);
          });
        }
      });
    }
  )
);
