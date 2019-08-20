const fallthrough = require('./fallthrough');
const logger = require('./logger');
const response = require('./response');
const basicAuth = require('./basic-auth');

module.exports = {
  basicAuth,
  fallthrough,
  logger,
  response,
};
