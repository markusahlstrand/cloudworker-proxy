const apiKeyApi = require('./apikey-api');
const basicAuth = require('./basic-auth');
const cors = require('./cors');
const jwt = require('./jwt');
const loadbalancer = require('./loadbalancer');
const logger = require('./logger');
const oauth2 = require('./oauth2');
const origin = require('./origin');
const response = require('./response');
const rateLimit = require('./rate-limit');
const split = require('./split');

module.exports = {
  apiKeyApi,
  basicAuth,
  cors,
  jwt,
  loadbalancer,
  logger,
  oauth2,
  origin,
  rateLimit,
  response,
  split,
};
