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
    handlerName: 'cors',
    path: '/edge',
    options: {},
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
      oauthClientId: process.env.OAUTH2_CLIENT_ID,
      oauth2ClientSecret: process.env.OAUTH2_CLIENT_SECRET,
      oauth2AuthDomain: process.env.OAUTH2_AUTH_DOMAIN,
      oauth2Audience: process.env.OAUTH2_AUDIENCE,
      oauth2CallbackPath: '/oauth2/callback',
      oauth2LogoutPath: '/oauth2/logout',
      oauth2Scopes: ['openid', 'email', 'profile', 'offline_access'],
      kvAccountId: process.env.KV_ACCOUNT_ID,
      kvNamespace: process.env.KV_NAMESPACE,
      kvAuthEmail: process.env.KV_AUTH_EMAIL,
      kvAuthKey: process.env.KV_AUTH_KEY,
      kvTtl: 60 * 60 * 24 * 30, // A month
    },
  },
  {
    handlerName: 'jwt',
    path: '/oauth2/.*',
    options: {
      jwksUri: process.env.JWKS_URI,
    },
  },
  {
    handlerName: 'apiKeyApi',
    path: '/oauth2/apikeys',
    options: {}
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
