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
  
);
