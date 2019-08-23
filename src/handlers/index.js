const basicAuth = require('./basic-auth');
const loadbalancer = require('./loadbalancer');
const logger = require('./logger');
const origin = require('./origin');
const response = require('./response');
const rateLimit = require('./rate-limit');

module.exports = {
  basicAuth,
  loadbalancer,
  logger,
  origin,
  rateLimit,
  response,
};
