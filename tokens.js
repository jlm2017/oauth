const uid = require('uid2');
const Promise = require('bluebird');
const VError = require('verror');

module.exports = function (client) {
  const mixin = {
    deserialize: function deserialize(str) {
      try {
        const payload = JSON.parse(str);

        return Object.assign(new this, payload);
      } catch (err) {
        throw new VError(err, 'Could not parse payload');
      }
    },

    find: function find(code) {
      return client.getAsync(Token.key(this.name, code))
        .then((result) => {
          return result !== null ? this.deserialize(result) : null;
        });
    },

    findAndDelete: function findAndDelete(code) {
      const key = Token.key(this.name, code);
      return client.multi()
        .get(key)
        .del(key)
        .execAsync()
        .then(([result]) => {
          return result !== null ? this.deserialize(result) : null;
        });
    }
  };

  class Token {
    save() {
      const payload = JSON.stringify(this);
      const key = this.key();
      return client.setAsync(key, payload, 'EX', this.expires())
        .then(() => this.token)
        .catch((err) => new VError(err, 'Could not save %s to redis', key));
    }

    key() {
      return Token.key(this.constructor.name, this.token);
    }

    static key(name, token) {
      return `${name}:${token}:payload`;
    }
  }

  return {
    AuthorizationCode: Object.assign(class AuthorizationCode extends Token {
      constructor(clientId, redirectURI, userID, scope) {
        super();
        Object.assign(this, {token: uid(16), clientId, redirectURI, userID, scope});
      }
      expires() {
        return 600;
      }
    }, mixin),

    AccessToken: Object.assign(class AccessToken extends Token {
      constructor(email, clientId, scope) {
        super();
        Object.assign(this, {token: uid(256), email, clientId, scope});
      }
      expires() {
        return 3600;
      }
    }, mixin),

    MailToken: Object.assign(class MailToken extends Token {
      constructor(userId, oauthParams) {
        super();
        Object.assign(this, {token: uid(64), userId, oauthParams});
      }
      expires() {
        return 600;
      }
    }, mixin)
  };
};
