const clients = require('./clients.json');
const scopes = require('./scopes.json');

// TODO implement proper client management
// The Client model currently uses a json file for client
// configuration which allows easy testing of the OAuth2 server

const client_map = clients.reduce((obj, client) => {
  obj[client.id] = client;
  return obj;
}, {});

const scopes_map = scopes.reduce((obj, scope) => {
  obj[scope.id] = scope;
  return obj;
}, {});

exports.find = function find(id) {
  return Promise.resolve(id in client_map ? client_map[id] : null);
};

exports.findAndValidateClient = function findAndValidateClient(id, redirectURI, scopes) {
  // don't forget to validate the scope !!

  const valid = (
    id in client_map
    && client_map[id].uris.includes(redirectURI)
    && scopes.every((scope) => client_map[id].scopes.includes(scope))
  );

  return Promise.resolve(valid ? client_map[id] : null);
};

exports.authenticateClient = function authenticateClient(id, secret) {
  // TODO : hash client secret (using which hash ?)
  if (id in client_map && client_map[id].secret === secret) {
    return Promise.resolve(client_map[id]);
  }
  else {
    return Promise.resolve(null);
  }
};

exports.scopeToExplanation = function (scopes) {
  return scopes.map((scope) => scopes_map[scope]);
};
