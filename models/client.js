const bcrypt = require('bcrypt');
const url = require('url');

const {Clients} = require('../io/api');
const scopes = require('./scopes.json');

// fakeHash used against timing attacks
const fakeHash = '$2a$10$hMzUK.S/9LM5XLuPyuc6d.5xpTPODX/Ke4kprEB12/XLm7b6be7jy';

const scopes_map = scopes.reduce((obj, scope) => {
  obj[scope.id] = scope;
  return obj;
}, {});

function removeQueryPart(uri) {
  const {protocol, host, pathname} = url.parse(uri);

  return `${protocol}//${host}${pathname}`;
}

exports.find = function find(id) {
  return Clients.get(id);
};


exports.findAndValidateClient = function findAndValidateClient(id, redirectURI, scopes) {
  return Clients.get(id)
    .then((client) => {
      const validClient = !!client;

      // the redirectURI must exactly match one of the URI registered for this client
      const validUri = validClient && client.uris.includes(redirectURI);

      // all the scopes must be included in the list of scopes registered for this client
      const validScope = validClient && scopes && scopes.every(scope => client.scopes.includes(scope));

      const valid = validUri && validScope;
      return valid ? client : null;
    });
};

exports.authenticateClient = function authenticateClient(id, secret) {
  return Clients.get(id)
    .then((client) => {
      return client ?
        bcrypt.compare(secret, client.secret)
          .then(verified =>  verified ? client : null) :
        // beware of timing attacks : hashing round even if client not found
        bcrypt.compare(secret, fakeHash)
          .then(() => null);
    });
};

exports.scopeToExplanation = function (scopes) {
  return scopes.map((scope) => scopes_map[scope]);
};
