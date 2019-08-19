const fallthrough = require('./fallthrough');
const logger = require('./logger');
const static = require('./static');
const basicAuth = require('./basic-auth');

module.exports = {
    basicAuth,
    fallthrough,
    logger,
    static,
};
