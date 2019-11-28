const apiKey = require('./apikey');
const apiKeyApi = require('./apikey-api');
const basicAuth = require('./basic-auth');
const cors = require('./cors');
const geoDecorator = require('./geo-decorator');
const jwt = require('./jwt');
const lambda = require('./lambda');
const loadbalancer = require('./loadbalancer');
const logger = require('./logger');
const oauth2 = require('./oauth2');
const origin = require('./origin');
const response = require('./response');
const rateLimit = require('./rate-limit');
const split = require('./split');
const transform = require('./transform');

module.exports = {
  apiKey,
  apiKeyApi,
  basicAuth,
  cors,
  geoDecorator,
  jwt,
  lambda,
  loadbalancer,
  logger,
  oauth2,
  origin,
  rateLimit,
  response,
  split,
  transform,
};
