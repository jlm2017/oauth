const {people} = require('../io/api');

module.exports = {
  findByEmail: function findByEmail(email) {
    return people.find({email})
      .then((res) => {
        return res[0] || null;
      });
  },

  get: function get(id) {
    return people.get(id);
  },

  addAuthorization(user, client, scopes) {
    user.authorizations = user.authorizations || [];
    let clientAuthIndex = user.authorizations.findIndex((auth) => auth.client === client._id);

    if(clientAuthIndex === -1) {
      user.authorizations.push({client: client._id, scopes: []});
      clientAuthIndex = user.authorizations.length - 1;
    }

    const clientAuth = user.authorizations[clientAuthIndex];

    if (scopes.some((scope) => !clientAuth.scopes.includes(scope))) {
      clientAuth.scopes = [...new Set([...clientAuth.scopes, ...scopes])];

      return user.save();
    }

    return Promise.resolve();
  }
};
