const oauth2orize = require('oauth2orize');
const login = require('connect-ensure-login');
const passport = require('passport');
const Promise = require('bluebird');

const {AuthorizationCode, AccessToken} = require('./models/tokens');
const Client = require('./models/client');
const {User} = require('./models/api');

const oauthServer = oauth2orize.createServer();

oauthServer.grant(oauth2orize.grant.code(function (client, redirectURI, user, ares, areq, done) {
  // Warning: the scope is found in the areq parameter, unlike what is said
  // in the documentation that puts it in ares
  const ac = new AuthorizationCode(client.id, redirectURI, user._id, areq.scope);
  ac.save()
    .then((code) => done(null, code))
    .catch((err) => done(err));
}));

oauthServer.exchange(oauth2orize.exchange.code(Promise.coroutine(
  function *(client, code, redirectURI, done) {
    try {
      const authCode = yield AuthorizationCode.find(code);

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

      // remember that the user has accepted this client with that scope
      yield User.addAuthorization(user, client, authCode.scope);

      // create and save new access token
      const at = new AccessToken(authCode.userId, authCode.clientId, authCode.scope);
      const token = yield at.save();

      return done(null, token);
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

exports.authorize = [
  login.ensureLoggedIn('/email'),
  oauthServer.authorization(function validate(clientID, redirectURI, scope, done) {
    // we must verify :
    // - that the redirectURI is part of allowed uris for this client
    // - that the elements of the scope are all included in authorized
    //   scopes for this client
    Client.findAndValidateClient(clientID, redirectURI, scope)
      .catch((err) => done(err))
      .then((client) => {
        if (client !== null) {
          return done(null, client, redirectURI);
        } else {
          return done(null, false);
        }
      });
  }, function immediate(client, user, scope, done) {
    // we immediately authorize, without asking the user, if:
    // - the client is trusted
    // - the user has already authorized this client with all the requested scopes

    if (client.is_trusted) {
      return done(null, true);
    }

    const userAuth = user.authorizations && user.authorizations.find((auth) => auth.client === client._id);
    if (userAuth && scope.every((s) => userAuth.scopes.includes(s))) {
      return done(null, true);
    }

    // If this is not the case, we will display the decision form (next middleware)
    return done(null, false);
  }),
  function showDecisionForm(req, res) {
    res.render('decision', {
      transactionID: req.oauth2.transactionID,
      user: req.user,
      client: req.oauth2.client,
      scope: Client.scopeToExplanation(req.oauth2.req.scope)
    });
  }
];

exports.decision = [
  login.ensureLoggedIn('/email'),
  oauthServer.decision()
];

exports.token = [
  passport.authenticate(['client_basic', 'client_body'], {session: false}),
  oauthServer.token(),
  oauthServer.errorHandler()
];
