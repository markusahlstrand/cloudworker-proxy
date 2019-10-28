const Proxy = require('../src/index');

const rules = [
  {
    path: '/split',
    name: 'split',
    options: {
      host: 'split.localhost',
    },
  },
  {
    name: 'logger',
    options: {
      type: 'http',
      url: process.env.LOGZ_IO_URL,
      contentType: 'text/plain',
      delimiter: '_',
    },
  },
  {
    name: 'rateLimit',
    options: {},
  },
  {
    name: 'response',
    host: 'localhost:3000',
    path: '/split',
    options: {
      body: 'This request is split to a separate request',
    },
  },
  {
    name: 'response',
    host: 'split.localhost',
    options: {
      body: 'This reponse is only available on the splitted request',
    },
  },
  {
    name: 'basicAuth',
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
    name: 'response',
    path: '/basic.*',
    options: {
      body: 'Very secret',
    },
  },
  {
    name: 'cors',
    path: '/edge',
    options: {},
  },
  {
    name: 'transform',
    path: '/edge',
    options: {
      transforms: [
        {
          regex: '.*',
          replace: '{{$0}} with a transformed result',
        },
      ],
    },
  },
  {
    name: 'response',
    path: '/edge',
    options: {
      body: 'This is a static page served directly from the edge',
    },
  },
  {
    name: 'transform',
    path: '/transform',
    options: {
      transforms: [
        {
          regex: '<body>',
          replace: '{{$0}}<script>alert("hello world!")</script>',
        },
      ],
    },
  },
  {
    name: 'response',
    path: '/transform',
    options: {
      body: '<html><body>A html page</body></html>',
      headers: {
        'content-type': 'text/html',
      },
    },
  },
  {
    name: 'transform',
    path: '/google/.*',
    options: {
      transforms: [
        {
          regex: 'google',
          replace: 'giggle',
        },
      ],
    },
  },
  {
    name: 'loadbalancer',
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
    name: 'apiKey',
    path: '/oauth2/.*',
    options: {
      oauthClientId: process.env.OAUTH2_CLIENT_ID,
      oauth2ClientSecret: process.env.OAUTH2_CLIENT_SECRET,
      oauth2AuthDomain: process.env.OAUTH2_AUTH_DOMAIN,
      kvAccountId: process.env.KV_ACCOUNT_ID,
      kvNamespace: process.env.KV_NAMESPACE,
      kvAuthEmail: process.env.KV_AUTH_EMAIL,
      kvAuthKey: process.env.KV_AUTH_KEY,
    },
  },
  {
    name: 'oauth2',
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
    },
  },
  {
    name: 'jwt',
    path: '/oauth2/.*',
    options: {
      jwksUri: process.env.JWKS_URI,
    },
  },
  {
    name: 'apiKeyApi',
    path: '/oauth2/apikeys',
    options: {
      createPath: '/oauth2/apikeys',
      kvAccountId: process.env.KV_ACCOUNT_ID,
      kvNamespace: process.env.KV_NAMESPACE,
      kvAuthEmail: process.env.KV_AUTH_EMAIL,
      kvAuthKey: process.env.KV_AUTH_KEY,
    },
  },
  {
    name: 'response',
    path: '/oauth2/.*',
    options: {
      body: 'This is a secret messages protected by oauth2',
    },
  },
  {
    name: 'origin',
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
