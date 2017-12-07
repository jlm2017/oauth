const passport = require('passport');
const BearerStrategy = require('passport-http-bearer').Strategy;
const BasicStrategy = require('passport-http').BasicStrategy;
const ClientPasswordStrategy = require('passport-oauth2-client-password').Strategy;
const LocalStrategy = require('passport-local');

const {MailToken, AccessToken} = require('./models/tokens');
const User = require('./models/people');
const Client = require('./models/client');

passport.serializeUser(function (user, done) {
  done(null, user._id);
});

passport.deserializeUser(async function (userId, done) {
  try {
    return done(null, await User.get(userId));
  } catch(err) {
    return done(null, false);
  }
});

/*
 * This authentication strategy is used when the end user
 * tries to authenticate on the website, generally because she
 * has been redirected here by a client.
 *
 * In this cas, she is first redirected to a form asking for her
 * email address: if she gives it, she is sent a message including
 * a link containing the access token used in this strategy.
 */
passport.use('mail_link', new BearerStrategy(
  async function (token, cb) {
    try {
      let mailToken = await MailToken.findAndDelete(token);

      if (mailToken === null) {
        return cb(null, false);
      }

      let user = await User.get(mailToken.userId);

      if (user.bounced) {
        user.bounced = false;
        user.emails[0].bounced = false;
        await user.save();
      }

      return cb(null, user, {direct: true});
    } catch (e) {
      cb(e);
    }
  }
));


passport.use('mail_code', new LocalStrategy(
  {passReqToCallback: true},
  async function (req, username, password, cb) {
    if (!(req.session.userId == username
        && req.session.code == password.trim()
        && req.session.csrf == req.body.csrf
        && new Date(req.session.codeExpiration) > new Date()
      )) {
      return cb(null, false);
    }

    try {
      let user = await User.get(req.session.userId);

      if (user.bounced) {
        user.bounced = false;
        user.emails[0].bounced = false;
        await user.save();
      }

      return cb(null, user, {direct: true});
    } catch (err) {
      return cb(err);
    }
  }
));

/*
 * Used by the two authentication strategies just below
 */
function authenticateClient(username, password, done) {
  Client.authenticateClient(username, password)
    .catch(done)
    .then((client) => {
      return done(null, client);
    });
}

/*
 * Used by clients as part of the token exchange step of
 * the OAuth2 authentication process
 *
 * Clients may either use this basic strategy or the
 * ClientPasswordStrategy just below
 */
passport.use('client_basic', new BasicStrategy(authenticateClient));

/*
 * Used by clients as part of the token exchange step of
 * the OAuth2 authentication process
 *
 * Clients may either use this ClientPassword strategy or the
 * BasicStrategy just above
 */
passport.use('client_body', new ClientPasswordStrategy(authenticateClient));

/*
 * Used by clients when they are acting on behalf of the user,
 * using the AccessToken they obtained using OAuth2.
 */
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

exports.connect = passport.authenticate('mail_link', {
  successReturnToOrRedirect: '/succes',
  failureRedirect: '/lien_incorrect'
});


exports.codeConnect = passport.authenticate('mail_code', {
  successReturnToOrRedirect: '/succes',
  failureRedirect: '/code_incorrect'
});

exports.disconnect = function (req, res) {
  req.logout();
  res.redirect('/email');
};
