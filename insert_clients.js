/**
 * Created by arthur on 07/03/17.
 */
const Promise = require('bluebird');
const bcrypt = require('bcrypt');

const {Clients} = require('./io/api');

const clients = require('./clients.json');

const insert_client = Promise.coroutine(function*(client) {
  // hash secret using bcrypt
  const salt = yield bcrypt.genSalt(10);
  client.secret = yield bcrypt.hash(client.secret, salt);

  // check if client exist
  const current = yield Clients.get(client.id);

  if(current === null) {
    // in this case, we just post it
    return yield Clients.post(client);
  } else {
    // put over previous client
    return yield Clients.put(current._id, client, {etag: current._etag});
  }
});

Promise.map(clients, insert_client).then(console.log, console.log);
