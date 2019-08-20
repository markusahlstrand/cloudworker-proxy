/**
 * This is the entry point for running the proxy locally using the node-cloudworker lib.
 */
// eslint-disable-next-line
require('dotenv').config();
// eslint-disable-next-line
const ncw = require('node-cloudworker');

ncw.applyShims();

const handler = require('./handler');

ncw.start(handler);
