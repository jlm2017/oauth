const oauth2orize = require('oauth2orize');
const login = require('connect-ensure-login');
const winston = require('winston');
const Promise = require('bluebird');

const {AuthorizationCode, AccessToken} = require('../models/tokens');
const Client = require('../models/client');
const User = require('../models/people');

winston.configure({
  transports: [
    new (winston.transports.Console)({
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      json: process.env.NODE_ENV === 'production',
      stringify: process.env.NODE_ENV === 'production',
      handleExceptions: true,
      humanReadableUnhandledException: true
    }),
  ]
});

const oauthServer = oauth2orize.createServer();

/*
 * Authorization code grant configuration
 */
oauthServer.grant(oauth2orize.grant.code(function (client, redirectURI, user, ares, areq, done) {
  // Warning: the scope is found in the areq parameter, unlike what is said
  // in the documentation that puts it in ares
  const ac = new AuthorizationCode(client.id, redirectURI, user._id, areq.scope);
  ac.save()
    .then((code) => done(null, code))
    .catch(done);
}));

/*
 * Token exchange configuration
 */
oauthServer.exchange(oauth2orize.exchange.code(Promise.coroutine(
  function * verifyRequest(client, code, redirectURI, done) {
    /*
     * Verify that the request is genuine and returns the newly generated access token
     *
     * Check that the authorization code given as part of the request is correct
     * and that all parameters (client id, redirect URI) are the same as they were
     * when the authorization code was generated.
     */
    try {
      const authCode = yield AuthorizationCode.find(code);

      // forbidden if Token does not exist
      if (authCode === null) {
        return done(null, false);
      }

      // We must check the parameters received as part of the token exchange
      // match those we previously received during the authorization code grant
      // to prevent some attacks where an attacker manages to get connected as
      // someone else
      // https://hueniverse.com/2011/06/21/oauth-2-0-redirection-uri-validation/
      if (client.id !== authCode.clientId) {
        return done(null, false);
      }
      if (redirectURI !== authCode.redirectURI) {
        return done(null, false);
      }

      // verify that user still exists
      const user = yield User.get(authCode.userId);
      if (user === null) {
        return done(null, false);
      }

      // validated! let's delete the token
      yield authCode.remove();

      // then remember that the user has accepted this client with that scope
      yield User.addAuthorization(user, client, authCode.scope);

      // then create and save new access token
      const at = new AccessToken(authCode.userId, authCode.clientId, authCode.scope);
      const token = yield at.save();

      const authInfo = {expires_in: at.expires()};

      // add profile information in the case the client asked and was authorized for
      // the scope 'view_profile'
      if (authCode.scope.includes('view_profile')) {
        authInfo.profile = user.url;
      }

      // and return it to the client
      return done(null, token, authInfo);
    } catch (err) {
      done(err);
    }
  })
));

oauthServer.serializeClient(function (client, done) {
  return done(null, client.id);
});

oauthServer.deserializeClient(function (id, done) {
  Client.find(id)
    .then((client) => done(null, client))
    .catch(done);
});

function validateAuthorizationCodeRequest(clientID, redirectURI, scope, done) {
  /**
   * Validate that the client is known and is allowed these scopes and redirect URI
   */
  Client.findAndValidateClient(clientID, redirectURI, scope)
    .catch((err) => done(err))
    .then((client) => {
      if (client !== null) {
        return done(null, client, redirectURI);
      } else {
        return done(null, false);
      }
    });
}

function checkIfBypassUserConfirmation(client, user, scope, done) {
  /**
   * Determines if the request should be immediately authorized, or if we should ask the user for confirmation
   *
   * we immediately authorize, without asking the user, if either:
   * - the client is indicated as trusted in our records
   * - the user has already authorized this client with all the requested scopes
   */
  try {
    if (client.trusted) {
      return done(null, true);
    }

    const userAuth = user.authorizations && user.authorizations.find((auth) => auth.client === client._id);
    if (userAuth && scope.every((s) => userAuth.scopes.includes(s))) {
      return done(null, true);
    }

    // If this is not the case, we will display the decision form (next middleware)
    return done(null, false);
  } catch (err) {
    done(err);
  }
}

function showDecisionForm(req, res, next) {
  /**
   * a controller that shows the decision form used to ask the user to confirm or reject the authorization request
   */
  Client.scopeToExplanation(req.oauth2.req.scope)
    .then(expls => {
      res.render('decision', {
        transactionID: req.oauth2.transactionID,
        user: req.user,
        client: req.oauth2.client,
        scope: expls
      });
    })
    .catch(next);
}


/**
 * Controllers for the authorization code endpoint
 */
exports.authorize = [
  login.ensureLoggedIn('/email'),
  oauthServer.authorization(validateAuthorizationCodeRequest, checkIfBypassUserConfirmation),
  showDecisionForm,
  function(err, req, res, next) {
    winston.error('Authentization endpoint error', err);
    next(err);
  },
  oauthServer.authorizationErrorHandler()
];

/***
 * Controllers handling the response from the decision form
 */
exports.decision = [
  login.ensureLoggedIn('/email'),
  oauthServer.decision()
];

/**
 * Controllers for the token exchange code endpoint
 */
exports.token = [
  oauthServer.token(),
  function(err, req, res, next) {
    winston.error('Token endpoint error', err);
    next(err);
  },
  oauthServer.errorHandler()
];
