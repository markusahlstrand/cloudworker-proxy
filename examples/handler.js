const Proxy = require('../src/index');

const rules = [
  {
    // This rule is place before the logger and ratelimit as it create a new separate request
    path: '/split',
    handlerName: 'split',
    options: {
      host: 'split.localhost',
    },
  },
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
    handlerName: 'logger',
    options: {
      type: 'kinesis',
      region: 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      streamName: 'cloudworker-proxy',
    },
  },
  {
    handlerName: 'rateLimit',
    options: {},
  },
  {
    handlerName: 'response',
    host: 'localhost:3000',
    path: '/',
    options: {
      body: {
        description: 'Sample endpoints for the cloudworker-proxy',
        links: [
          {
            split: '/split',
          },
          {
            basicAuth: '/basic/test',
          },
          {
            response: '/edge',
          },
          {
            oauth2: '/oauth2/test',
          },
          {
            transform: '/transform',
          },
          {
            awsLambda: '/lambda/test',
          },
          {
            googleFunctions: '/google/test',
          },
        ],
      },
    },
  },
  {
    handlerName: 'response',
    host: 'localhost:3000',
    path: '/split',
    options: {
      body: 'This request is split to a separate request',
    },
  },
  {
    handlerName: 'response',
    host: 'split.localhost',
    options: {
      body: 'This reponse is only available on the splitted request',
    },
  },
  {
    handlerName: 'basicAuth',
    path: '/basic/:path*',
    options: {
      users: [
        {
          userhandlerName: 'test',
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
    handlerName: 'transform',
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
    handlerName: 'response',
    path: '/edge',
    options: {
      body: 'This is a static page served directly from the edge',
    },
  },
  {
    handlerName: 'transform',
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
    handlerName: 'response',
    path: '/transform',
    options: {
      body: '<html><body>A html page</body></html>',
      headers: {
        'content-type': 'text/html',
      },
    },
  },
  {
    handlerName: 'lambda',
    path: '/lambda/.*',
    options: {
      region: 'us-east-1',
      lambdaName: 'lambda-hello-dev-hello',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  },
  {
    handlerName: 'transform',
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
    handlerName: 'apiKey',
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
    options: {
      createPath: '/oauth2/apikeys',
      kvAccountId: process.env.KV_ACCOUNT_ID,
      kvNamespace: process.env.KV_NAMESPACE,
      kvAuthEmail: process.env.KV_AUTH_EMAIL,
      kvAuthKey: process.env.KV_AUTH_KEY,
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
