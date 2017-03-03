const passport = require('passport');
const BearerStrategy = require('passport-http-bearer').Strategy;
const BasicStrategy = require('passport-http').BasicStrategy;
const ClientPasswordStrategy = require('passport-oauth2-client-password').Strategy;

const {MailToken, AccessToken} = require('./models/tokens');
const {User} = require('./models/api');
const Client = require('./models/client');

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (userId, done) {
  User.get(userId)
    .catch(done)
    .then((user) => done(null, user));
});

passport.use('mail_auth', new BearerStrategy(
  function (token, cb) {
    MailToken.findAndDelete(token)
      .then(function (mailToken) {
        if (mailToken === null) {
          return cb(null, false);
        } else {
          return User.get(mailToken.userId)
            .then((user) => cb(null, user, {direct: true}));
        }
      })
      .catch((err) => {
        cb(err);
      });
  }
));

passport.use('client_basic', new BasicStrategy(
  function (username, password, done) {
    Client.authenticateClient(username, password)
      .catch(done)
      .then((client) => {
        return done(null, client);
      });
  }
));

passport.use('client_body', new ClientPasswordStrategy(
  function (clientId, clientSecret, done) {
    Client.authenticateClient(clientId, clientSecret)
      .catch(done)
      .then((client) => {
        return done(null, client);
      });
  }
));

passport.use('client_api', new BearerStrategy(
  function (accessToken, done) {
    AccessToken.find(accessToken)
      .then((token) => {
        return User.get(token.userId)
          .then((user) => user ? done(null, user, {scopes: token.scope}) : done(null, false));
      })
      .catch(done);
  }
));
