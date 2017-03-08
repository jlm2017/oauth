const {People} = require('../io/api');

//const config = require('../config');

exports.User = {
  findByEmail: function findByEmail(email) {
    return People.getAll({where: {email}})
      .then((items) => {
        return items.length ? items[0] : null;
      });
  },

  get: function get(id) {
    return People.get(id);
  },

  put: function(id, content) {
    return People.put(id, content);
  },

  addAuthorization(user, client, scopes) {
    const authorizations = user.authorizations || [];
    let clientAuthIndex = authorizations.findIndex((auth) => auth.client === client._id);

    if(clientAuthIndex === -1) {
      authorizations.push({client: client._id, scopes: []});
      clientAuthIndex = authorizations.length - 1;
    }

    const clientAuth = authorizations[clientAuthIndex];

    if (scopes.some((scope) => !clientAuth.scopes.includes(scope))) {
      clientAuth.scopes = [...new Set([...clientAuth.scopes, ...scopes])];

      return People.patch(user._id, {authorizations}, {etag: user._etag});
    }

    return Promise.resolve();
  }
};
