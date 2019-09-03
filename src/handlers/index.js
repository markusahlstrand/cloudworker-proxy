const basicAuth = require('./basic-auth');
const cors = require('./cors');
const loadbalancer = require('./loadbalancer');
const logger = require('./logger');
const oauth2 = require('./oauth2');
const origin = require('./origin');
const response = require('./response');
const rateLimit = require('./rate-limit');
const split = require('./split');

module.exports = {
  basicAuth,
  cors,
  loadbalancer,
  logger,
  oauth2,
  origin,
  rateLimit,
  response,
  split,
};
