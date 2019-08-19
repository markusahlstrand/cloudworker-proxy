/**
 * This is the entry point for running the proxy locally using the node-cloudworker lib.
 */
const ncw = require("node-cloudworker");
ncw.applyShims();

const handler = require('./handler');

ncw.start(handler);
