/**
 * This is the entry point for running the proxy locally using the node-cloudworker lib.
 */
// eslint-disable-next-line
require('dotenv').config({ path: '.env' });
// eslint-disable-next-line
const ncw = require('node-cloudworker');

ncw.applyShims({
  kv: {
    accountId: process.env.KV_ACCOUNT_ID,
    authEmail: process.env.KV_AUTH_EMAIL,
    authKey: process.env.KV_AUTH_KEY,
    bindings: [
      {
        variable: 'TEST_NAMESPACE',
        namespace: process.env.KV_NAMESPACE_TEST,
      },
    ],
  },
});

const handler = require('./handler');

ncw.start(handler);
