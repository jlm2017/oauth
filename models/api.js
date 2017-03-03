const Promise = require('bluebird');

//const config = require('../config');

// TODO implement user management
// The User model is currently a stub used for testing the
// oauth process, and it uses hardcoded user for this reason.

const users = [
  {
    id: 'user1',
    email: 'arthur+1@cheysson.fr'
  },
  {
    id: 'user2',
    email: 'arthur+2@cheysson.fr'
  }
];

exports.User = {
  findByEmail: function findByEmail(email) {
    const user = users.find((u) => u.email === email);

    return Promise.resolve(user || null);
  },

  get: function get(id) {
    const user = users.find((u) => u.id === id);
    return Promise.resolve(user || null);
  },

  save: function(user) {
    const existingIdx = users.findIndex((u) => u.id === user.id);

    if(existingIdx) {
      for(let attr of Object.keys(user)) {
        users[existingIdx][attr] = user[attr];
      }
    } else {
      users.push(user);
    }

    return Promise.resolve(true);
  }
};
