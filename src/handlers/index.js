const origin = require('./origin');
const logger = require('./logger');
const response = require('./response');
const basicAuth = require('./basic-auth');

module.exports = {
  basicAuth,
  origin,
  logger,
  response,
};
