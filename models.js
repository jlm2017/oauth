const Promise = require('bluebird');

module.exports = (API_ENDPOINT, API_KEY) => ({
  User: class User {
    constructor() {
    }

    static findByEmail(email) {
      if (email === 'arthur@cheysson.fr') {
        return Promise.resolve({
          _id: '586d47e3ab1089165168af36',
          email: 'arthur@cheysson.fr'
        });
      } else {
        return Promise.resolve(null);
      }
    }

    static get(id) {
      if (id ==='586d47e3ab1089165168af36') {
        return Promise.resolve({
          _id: '586d47e3ab1089165168af36',
          email: 'arthur@cheysson.fr'
        });
      } else {
        return Promise.resolve(null);
      }
    }
  }
});
