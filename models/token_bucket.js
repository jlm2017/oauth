const fs = require('fs');
const redisClient = require('../io/redis_client');


class RateLimitedError {
  constructor(rateLimit) {
    this.rateLimit = rateLimit;
  }
}


class TokenBucket {
  constructor({max, interval, name}) {
    /*
     * max: max number of tokens in bucket
     * interval: interval in seconds for refilling
     * initial: initial number of tokens
     */

    this.max = max;
    this.interval = interval;
    this.name = name;
  }

  async checkIfAllowed(id, amount) {
    if (amount === undefined) {
      amount = 1;
    }

    const keyPrefix = `TokenBucket:${this.name}:${id}:`;
    const args = [
      2, `${keyPrefix}v`, `${keyPrefix}t`,
      this.max, this.interval, Date.now() / 1000, amount
    ];

    let value;

    if(scriptHash !== null) {
      value = await redisClient.evalshaAsync(scriptHash, ...args);
    } else {
      value = await redisClient.evalAsync(script, ...args);
    }

    return !!value;
  }

  async raiseIfNotAllowed(id, amount) {
    if(!await this.checkIfAllowed(id, amount)) {
      throw new RateLimitedError(this.name);
    }
  }
}

const script = fs.readFileSync('./models/token_bucket.lua', 'utf8');
let scriptHash = null;

redisClient.script('LOAD', script, function(err, res) {
  scriptHash = res;
});

module.exports = {TokenBucket, RateLimitedError};
