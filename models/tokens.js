const uuid = require('uuid/v4');
const VError = require('verror');
const crypto = require('crypto');
const {promisify} = require('util');

const config = require('../config');

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
    Object.assign(this, {token: uuid(16), clientId, redirectURI, userId, scope});
  }

  expires() {
    return 600;
  }
}, mixin);

exports.AccessToken = Object.assign(class AccessToken extends Token {
  constructor(userId, clientId, scope) {
    super();
    Object.assign(this, {token: uuid(128), userId, clientId, scope});
  }

  expires() {
    return 3600;
  }
}, mixin);


async function randomDigitCode(length) {
  // TODO: make the distribution of tokens uniform
  let code = '';

  for (let i = 0; i < length; i++) {
    let buf = await promisify(crypto.randomBytes)(4);
    code += (buf.readUInt32BE(0) % 10).toString();
  }

  return code;
}


exports.LoginCode = {
  async getNewCode(userId) {
    /*
     * Generate a new login code
     *
     * The code is generated and stored into the redis list that holds the codes for the user
     * The function then returns both the code and its expiration date
     *
     * userId: the id of the user for which to generate the login code
     */
    const code = await randomDigitCode(8);
    const expiration = new Date(new Date().getTime() + 1000 * 60 * config.mailCodeDuration);
    const key = `LoginCode:${userId}`;

    const payload = JSON.stringify({code, expiration: expiration.getTime()});

    /*
     - push the new code to the redis list that holds all the current codes for the user
     - trim the list to limit it to the required number of valid codes
     - set the expiration time to the mailCodeDuration, because the last code we added is likely the
       most recent one. There could be race conditions, but their only effect would be to expire a code
       a few seconds too early.
     */
    await redisClient.multi()
      .lpush(key, payload)
      .ltrim(key, 0, config.concurrentValidCodes - 1)
      .expire(key, 60 * config.mailCodeDuration)
      .execAsync();

    return {code, expiration};
  },

  async checkCode(userId, code) {
    /*
     * check that a login code is valid for a specific user.
     *
     * If valid, the code is deleted from the redis list
     */
    const key = `LoginCode:${userId}`;
    const tentativeCode = Buffer.from(code);
    const now = new Date().getTime();

    const list = await redisClient.lrangeAsync(key, 0, config.concurrentValidCodes - 1);
    const codes = list.map(s => JSON.parse(s)).filter(c => (c.expiration >= now));

    // use filter (vs. find) and timingSafeEqual to avoid timing attacks
    const validCodes = codes.filter(c => (code.length === c.code.length) && crypto.timingSafeEqual(Buffer.from(c.code), tentativeCode));

    if (validCodes.length > 0) {
      let multi = redisClient.multi();
      for (let code of validCodes) {
        multi = multi.lrem(key, 1, JSON.stringify(code));
      }
      await multi.execAsync();
    }

    return validCodes.length > 0;
  }
};
