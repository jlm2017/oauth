const api = require('@fi/api-client');

const config = require('../config');

const apiClient = api.createClient({
  clientId: config.clientId,
  clientSecret: config.clientSecret,
  endpoint: config.api_endpoint
});

apiClient.exceptions = api.exceptions;

module.exports = apiClient;
