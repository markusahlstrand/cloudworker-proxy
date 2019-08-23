const basicAuth = require('./basic-auth');
const logger = require('./logger');
const origin = require('./origin');
const response = require('./response');
const rateLimit = require('./rate-limit');

module.exports = {
  basicAuth,
  logger,
  origin,
  rateLimit,
  response,
};
