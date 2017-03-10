const uid = require('uid-safe').sync;
const VError = require('verror');

const redisClient = require('../io/redis_client');

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
    return redisClient.getAsync(Token.key(this.name, code))
      .then((result) => {
        return result !== null ? this.deserialize(result) : null;
      });
  },

  findAndDelete: function findAndDelete(code) {
    const key = Token.key(this.name, code);
    return redisClient.multi()
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
    // TODO: implements more sophisticated saving that would allow browsing of the tokens
    // tokens should be saved on a set with the user,
    // and in a zset with expiry date to be able to purge
    // the users set when the tokens expire
    const payload = JSON.stringify(this);
    const key = this.key();
    return redisClient.setAsync(key, payload, 'EX', this.expires())
      .then(() => this.token)
      .catch((err) => new VError(err, 'Could not save %s to redis', key));
  }

  remove() {
    return redisClient.delAsync(this.key());
  }

  key() {
    return Token.key(this.constructor.name, this.token);
  }

  static key(name, token) {
    return `${name}:${token}:payload`;
  }
}

exports.AuthorizationCode = Object.assign(class AuthorizationCode extends Token {
  constructor(clientId, redirectURI, userId, scope) {
    super();
    Object.assign(this, {token: uid(16), clientId, redirectURI, userId, scope});
  }

  expires() {
    return 600;
  }
}, mixin);

exports.AccessToken = Object.assign(class AccessToken extends Token {
  constructor(userId, clientId, scope) {
    super();
    Object.assign(this, {token: uid(128), userId, clientId, scope});
  }

  expires() {
    return 3600;
  }
}, mixin);

exports.MailToken = Object.assign(class MailToken extends Token {
  constructor(userId) {
    super();
    Object.assign(this, {token: uid(64), userId});
  }

  expires() {
    return 600;
  }
}, mixin);
