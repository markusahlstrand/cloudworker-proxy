const basicAuth = require('./basic-auth');
const cors = require('./cors');
const geoDecorator = require('./geo-decorator');
const jwt = require('./jwt');
const kvStorage = require('./kv-storage');
const lambda = require('./lambda');
const loadbalancer = require('./loadbalancer');
const logger = require('./logger');
const oauth2 = require('./oauth2');
const origin = require('./origin');
const response = require('./response');
const rateLimit = require('./rate-limit');
const s3 = require('./s3');
const split = require('./split');
const transform = require('./transform');

module.exports = {
  basicAuth,
  cors,
  geoDecorator,
  jwt,
  kvStorage,
  lambda,
  loadbalancer,
  logger,
  oauth2,
  origin,
  rateLimit,
  response,
  s3,
  split,
  transform,
};
