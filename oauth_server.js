const oauth2orize = require('oauth2orize');
const login = require('connect-ensure-login');
const passport = require('passport');

const {AuthorizationCode, AccessToken} = require('./models/tokens');
const Client = require('./models/client');

const oauthServer = oauth2orize.createServer();

oauthServer.grant(oauth2orize.grant.code(function (client, redirectURI, user, ares, areq, done) {
  // Warning: the scope is found in the areq parameter, unlike what is said
  // in the documentation that puts it in ares
  const ac = new AuthorizationCode(client.id, redirectURI, user.id, areq.scope);
  ac.save()
    .then((code) => done(null, code))
    .catch((err) => done(err));
}));

oauthServer.exchange(oauth2orize.exchange.code(function (client, code, redirectURI, done) {
  AuthorizationCode.find(code)
    .then((code) => {
      if (client.id !== code.clientId) {
        return done(null, false);
      }
      if (redirectURI !== code.redirectURI) {
        return done(null, false);
      }

      const at = new AccessToken(code.userId, code.clientId, code.scope);
      return at.save();
    })
    .then((token) => done(null, token))
    .catch((err) => done(err));
}));

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
    // - the user has already authorized this client with all the current scopes
    // TODO verify if user has already accepted all the scopes for this client
    // TODO verify if client is trusted
    // pour le moment, on affiche toujours le formulaire
    done(null, false);
  }),
  // add middleware to show decision form here
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
