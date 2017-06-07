const {clients, scopes, exceptions} = require('../io/api');

exports.find = function find(id) {
  return clients.getById(id);
};


exports.findAndValidateClient = function findAndValidateClient(id, redirectURI, scopes) {
  return clients.getById(id)
    .then((client) => {
      // the redirectURI must exactly match one of the URI registered for this client
      const validUri = client.uris.includes(redirectURI);

      // all the scopes must be included in the list of scopes registered for this client
      const validScope = scopes && scopes.every(scope => client.scopes.includes(scope));

      const valid = validUri && validScope;

      return valid ? client : null;
    })
    .catch(err => {
      if (err instanceof exceptions.NotFoundError) {
        return null;
      }
      throw err;
    });
};

exports.authenticateClient = function authenticateClient(id, secret) {
  return clients.authenticate.post({id, secret})
    .then((client) => {
      return client;
    })
    .catch(err => {
      if (err instanceof exceptions.ValidationError) {
        return null;
      }
      throw err;
    });
};

exports.scopeToExplanation = function (scopeLabels) {
  return scopes.list()
    .then(l => {
      const scopes_map = {};
      for (let scope of l) {
        scopes_map[scope.label] = scope.description;
      }
      return scopeLabels.map((scope) => scopes_map[scope]);
    });
};
