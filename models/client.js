const bcrypt = require('bcrypt');
const url = require('url');

const {Clients} = require('../io/api');
const scopes = require('./scopes.json');

// used against timing attacks
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
  const baseURI = removeQueryPart(redirectURI);

  return Clients.get(id)
    .then((client) => {
      const valid = client && client.uris.includes(baseURI) && scopes.every((scope) => client.scopes.includes(scope));
      return valid ? client : null;
    });
};

exports.authenticateClient = function authenticateClient(id, secret) {
  return Clients.get(id)
    .then((client) => {
      return client
        ? bcrypt.compare(secret, client.secret)
          .then((verified) => {
            return verified ? client : null;
          })
        // beware of timing attacks : hashing round even if client not found
        : bcrypt.compare(secret, fakeHash)
          .then(() => null);
    });
};

exports.scopeToExplanation = function (scopes) {
  return scopes.map((scope) => scopes_map[scope]);
};