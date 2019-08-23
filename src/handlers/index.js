const basicAuth = require('./basic-auth');
const loadbalancer = require('./loadbalancer');
const logger = require('./logger');
const oauth2 = require('./oauth2');
const origin = require('./origin');
const response = require('./response');
const rateLimit = require('./rate-limit');

module.exports = {
  basicAuth,
  loadbalancer,
  logger,
  oauth2,
  origin,
  rateLimit,
  response,
};
