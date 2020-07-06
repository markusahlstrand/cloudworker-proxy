// require('dotenv').config({ path: '../.env' });
require('dotenv').config({ path: '.env' });
const fs = require('fs');
const ncw = require('node-cloudworker');
const crypto = require('crypto');

ncw.applyShims();

const KvStorage = require('../../src/services/kv-storage');

const kvStorage = new KvStorage({
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
  namespace: process.env.KV_NAMESPACE_TEST,
  authEmail: process.env.CLOUDFLARE_AUTH_EMAIL,
  authKey: process.env.CLOUDFLARE_AUTH_KEY,
  ttl: null,
});

console.log('start');

const data = fs.readFileSync('examples/templates/test.html', 'utf8');
const buffer = Buffer.from(data);
const etag = `W/${crypto.createHash('md5').update(data).digest('hex')}`;
kvStorage
  .put('test.html', buffer, {
    headers: {
      etag,
      'content-type': 'text/html',
      'x-content-length': buffer.length,
      'content-length': buffer.length,
    },
  })
  .then(() => {
    console.log('Done');
  })
  .catch((err) => {
    console.log('Failed: ' + err.message);
  });
