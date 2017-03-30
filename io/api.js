const api = require('@fi/api-client');

const config = require('../config');

const apiClient = api.createClient({
  auth: 'basicToken',
  token: config.api_key,
  endpoint: config.api_endpoint
});

module.exports = apiClient;
