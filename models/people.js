const {people, authorizations} = require('../io/api');

module.exports = {
  findByEmail: function findByEmail(email) {
    return people.list({email})
      .then((res) => {
        return res[0] || null;
      });
  },

  get: function get(id) {
    return people.getById(id);
  },

  addAuthorization(user, client, scopes) {
    user.authorizations = user.authorizations || [];
    let clientAuthIndex = user.authorizations.findIndex((auth) => auth.client === client.url);

    if(clientAuthIndex === -1) {
      user.authorizations.push({client: client._id, scopes: []});

      const newAuth = authorizations.create({
        client: client.url,
        person: user.url,
        scopes: scopes
      });

      return newAuth.save();
    }

    const clientAuth = user.authorizations[clientAuthIndex];

    if (scopes.some((scope) => !clientAuth.scopes.includes(scope))) {
      clientAuth.scopes = [...new Set([...clientAuth.scopes, ...scopes])];
      return clientAuth.save();
    }

    return Promise.resolve();
  }
};
