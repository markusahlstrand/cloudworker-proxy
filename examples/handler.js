const Proxy = require('../src/index');

const rules = [
  {
    handlerName: 'logger',
    options: {
      type: 'http',
      url: process.env.LOGZ_IO_URL,
      contentType: 'text/plain',
      delimiter: '_',
    },
  },
  {
    handlerName: 'rateLimit',
    options: {},
  },
  {
    handlerName: 'basicAuth',
    path: '/basic/:path*',
    options: {
      users: [
        {
          username: 'test',
          authToken: 'dGVzdDpwYXNzd29yZA==', // "password" Base64 encoded
        },
      ],
      logoutPath: '/basic/logout',
    },
  },
  {
    handlerName: 'response',
    path: '/basic.*',
    options: {
      body: 'Very secret',
    },
  },
  {
    handlerName: 'response',
    path: '/edge',
    options: {
      body: 'This is a static page served directly from the edge',
    },
  },
  {
    handlerName: 'loadbalancer',
    path: '/google/:file*',
    options: {
      sources: [
        {
          url: 'https://us-central1-ahlstrand-es.cloudfunctions.net/hello/{file}',
        },
      ],
    },
  },
  {
    handlerName: 'oauth2',
    path: '/oauth2/.*',
    options: {
      kvAccountId: process.env.KV_ACCOUNT_ID,
      kvNamespace: process.env.KV_NAMESPACE,
      kvAuthEmail: process.env.KV_AUTH_EMAIL,
      kvAuthKey: process.env.KV_AUTH_KEY,
      kvTtl: 60 * 60 * 24 * 30, // A month
    },
  },
  {
    handlerName: 'response',
    path: '/oauth2/.*',
    options: {
      body: 'This is a secret messages protected by oauth2',
    },
  },
  {
    handlerName: 'origin',
    options: {
      localOriginOverride: 'https://static.ahlstrand.es',
    },
  },
];

const proxy = new Proxy(rules);

/**
 * Fetch and log a given request object
 * @param {Request} options
 */
async function handler(event) {
  return proxy.resolve(event);
}

module.exports = handler;
