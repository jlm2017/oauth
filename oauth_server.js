const oauth2orize = require('oauth2orize');
const oauth = require('./tokens');
const {AuthorizationCode, AccessToken} = oauth;

const oauthServer = module.exports = oauth2orize.createServer();

oauthServer.grant(oauth2orize.grant.code(function (client, redirectURI, user, ares, done) {
  const ac = new AuthorizationCode(client.id, redirectURI, user.id, ares.scope);
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
