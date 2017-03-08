const base64 = require('js-base64').Base64;
const request = require('superagent');

const config = require('../config');

const authHeaderValue = 'Basic ' + base64.encode(`${config.api_key}:`);

const headers = {
  'Authorization': authHeaderValue,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

class Resource {
  constructor(name) {
    this.baseUrl = `${config.api_endpoint}/${name}/`;
  }

  get(id) {
    const url = `${this.baseUrl}${id}`;
    return request.get(url)
      .set(headers)
      .then((res) => {
        if (res.ok) {
          return res.body;
        }
      })
      .catch((err) => {
        if (err.status === 404) {
          // missing item
          return null;
        }
        // otherwise, just rethrow
        throw err;
      });
  }

  getAll(options) {
    options = options || {};
    const {where} = options;
    const query = {};

    if (where) {
      query['where'] = JSON.stringify(where);
    }

    return request.get(this.baseUrl)
      .set(headers)
      .query(query)
      .then((res) => {
        return res.body._items;
      });
  }

  post(content) {
    return request.post(this.baseUrl)
      .set(headers)
      .send(content);
  }

  patch(id, content, options) {
    options = options || {};
    const {overwriteIfChanged, etag} = options;
    const url = `${this.baseUrl}${id}`;

    if (!overwriteIfChanged && !etag) {
      throw new Error('Either set overwriteIfChanged to true or provide etag');
    }

    if (etag) {
      // if we got an etag, we can try to directly patch
      return request
        .patch(url, content)
        .set('If-Match', etag)
        .set(headers)
        .catch((err) => {
          // EVE Python gives back status code 428 if the etag
          // was not up to date
          if (err.status === 428 && overwriteIfChanged) {
            // In this case, we just try patching again with the new etag
            return this.getAndPatch(id, content);
          }
          throw err;
        });
    }
  }

  forcePatch(id, content) {
    const url = `${this.baseUrl}${id}`;

    return this.get(id)
      .then((current) => {
        if (current === null) {
          throw new Error(`Tried to patch non existent ${this.name}/${id}`);
        } else {
          return request
            .patch(url, content)
            .set('If-Match', current._etag)
            .set(headers);
        }
      });
  }

  put(id, content, options) {
    options = options || {};
    const {overwriteIfChanged, etag} = options;
    const url = `${this.baseUrl}${id}`;

    if (!overwriteIfChanged && !etag) {
      throw new Error('Either set overwriteIfChanged to true or provide etag');
    }

    if (etag) {
      // if we got an etag, we can try to directly patch
      return request
        .put(url, content)
        .set('If-Match', etag)
        .set(headers)
        .catch((err) => {
          // EVE Python gives back status code 428 if the etag
          // was not up to date
          if (err.status === 428 && overwriteIfChanged) {
            // In this case, we just try patching again with the new etag
            return this.getAndPatch(id, content);
          }
          throw err;
        });
    }
  }

  forcePut(id, content) {
    const url = `${this.baseUrl}${id}`;

    return this.get(id)
      .then((current) => {
        if (current === null) {
          throw new Error(`Tried to patch non existent ${this.name}/${id}`);
        } else {
          return request
            .put(url, content)
            .set('If-Match', current._etag)
            .set(headers);
        }
      });
  }
}

exports.People = new Resource('people');
exports.Clients = new Resource('clients');
