const url = require('url');
const passport = require('passport');
const BasicStrategy = require('passport-http').BasicStrategy;
const ClientPasswordStrategy = require('passport-oauth2-client-password').Strategy;
const LocalStrategy = require('passport-local');

const config = require('./config');
const User = require('./models/people');
const Client = require('./models/client');
const {LoginCode} = require('./models/tokens');
const {TokenBucket} = require('./models/token_bucket');
const codeTokenBucket = new TokenBucket({name: 'loginCode', max: 10, interval: 90,});

passport.serializeUser(function (user, done) {
  done(null, user._id);
});

passport.deserializeUser(async function (userId, done) {
  try {
    return done(null, await User.get(userId));
  } catch (err) {
    return done(null, false);
  }
});

passport.use('mail_code', new LocalStrategy(
  {passReqToCallback: true},
  async function (req, username, password, cb) {
    try {
      /*
       * In this order :
       * - check csrf protection
       * - check rate limit
       * - verify code is correct
       */

      if ((req.session.userId !== username) || (req.session.csrf !== req.body.csrf)) {
        return cb(null, false);
      }

      await codeTokenBucket.raiseIfNotAllowed(username);

      if (!await LoginCode.checkCode(username, password.replace(/\s/g, ''))) {
        return cb(null, false);
      }

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

function handleLoginRateLimit(err, req, res, next) {
  if (err.rateLimit && err.rateLimit === 'loginCode') {
    return res.render('code_rate_limited');
  }
  next(err);
}

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

exports.codeConnect = [
  passport.authenticate('mail_code', {
    successReturnToOrRedirect: '/succes',
    failureRedirect: '/code_incorrect'
  }),
  handleLoginRateLimit
];

exports.disconnect = function (req, res, next) {
  req.logout();
  if (req.query.next) {
    try {
      const nextUrl = new url.URL(req.query.next, config.defaultLogoutRedirect);
      if (config.allowedLogoutRedirect.includes(nextUrl.hostname)) {
        return res.redirect(nextUrl.toString());
      }
    } catch(e) {
      if (!(e instanceof TypeError)) {
        next(e);
      }
    }
  }

  res.redirect('/email');
};
