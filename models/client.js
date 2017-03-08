const scopes = require('./scopes.json');
const bcrypt = require('bcrypt');

const {Clients} = require('../io/api');

// used against timing attacks
const fakeHash = '$2a$10$hMzUK.S/9LM5XLuPyuc6d.5xpTPODX/Ke4kprEB12/XLm7b6be7jy';

const scopes_map = scopes.reduce((obj, scope) => {
  obj[scope.id] = scope;
  return obj;
}, {});

exports.find = function find(id) {
  return Clients.get(id);
};

exports.findAndValidateClient = function findAndValidateClient(id, redirectURI, scopes) {
  return Clients.get(id)
    .then((client) => {
      const valid = client.uris.includes(redirectURI) && scopes.every((scope) => client.scopes.includes(scope));
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