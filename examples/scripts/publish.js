require('dotenv').config();
const fs = require('fs');
const ncw = require('node-cloudworker');

ncw.applyShims();

const KvStorage = require('../../src/services/kv-storage');

const kvStorage = new KvStorage({
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
  namespace: process.env.KV_NAMESPACE_TEMPLATES,
  authEmail: process.env.CLOUDFLARE_AUTH_EMAIL,
  authKey: process.env.CLOUDFLARE_AUTH_KEY,
  ttl: null,
});

console.log('start');

const data = fs.readFileSync('examples/templates/test.html', 'utf8');
kvStorage
  .put('test.html', data)
  .then(() => {
    console.log('Done');
  })
  .catch((err) => {
    console.log('Failed: ' + err.message);
  });
