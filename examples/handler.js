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
    handlerName: 'geoDecorator',
    path: '/geo',
    options: {},
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
  // {
  //   handlerName: 'logger',
  //   options: {
  //     type: 'kinesis',
  //     region: 'us-east-1',
  //     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  //     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  //     streamName: 'cloudworker-proxy',
  //   },
  // },
  {
    handlerName: 'rateLimit',
    options: {},
  },
  {
    handlerName: 'response',
    protocol: 'http',
    host: 'proxy.cloudproxy.io',
    options: {
      status: 302,
      body: 'Redirect to https',
      headers: {
        location: 'https://proxy.cloudproxy.io',
      },
    },
  },
  {
    handlerName: 'response',
    path: '/',
    options: {
      body: {
        description: 'Sample endpoints for the cloudworker-proxy',
        links: [
          {
            name: 'split',
            description: 'Splits the request pipeline into two separate pipelines',
            url: 'https://proxy.cloudproxy.io/split',
          },
          {
            name: 'Basic auth',
            description: 'Protects a resource with basic auth',
            url: 'https://proxy.cloudproxy.io/basic/test',
          },
          {
            name: 'geo',
            description: 'Routes to different pages depending on geo',
            url: 'https://proxy.cloudproxy.io/geo',
          },
          {
            name: 'Response',
            description: 'Generates a static response straight from the edge',
            url: 'https://proxy.cloudproxy.io/edge',
          },
          {
            name: 'S3 + cache',
            description: 'Fetches file from S3 and caches using cloudflare cache',
            url: 'https://proxy.cloudproxy.io/s3/logo.png',
          },
          {
            name: 'Basic auth',
            description: 'Protects a resource with oAuth2. In this case with auth0',
            url: 'https://proxy.cloudproxy.io/oauth2/test',
          },
          {
            name: 'Transform response',
            description: 'Rewrite responses using regular expressions',
            url: 'https://proxy.cloudproxy.io/transform',
          },
          {
            name: 'Invoke lambda',
            description:
              'Invokes a lambda straight from the edge without paying for the api gateway from aws',
            url: 'https://proxy.cloudproxy.io/lambda/test',
          },
          {
            name: 'Invoke google cloud function',
            description:
              'Invokes a google cloud function via http. Makes it easier to get custom domains working',
            url: 'https://proxy.cloudproxy.io/google/test',
          },
        ],
      },
    },
  },
  {
    handlerName: 'response',
    path: '/geo',
    headers: {
      'proxy-continent': 'EU',
    },
    options: {
      body: 'This is served to clients in EU',
    },
  },
  {
    handlerName: 'response',
    path: '/geo',
    options: {
      body: 'This is served to clients outside the EU',
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
    handlerName: 'cache',
    path: '/s3/:file*',
    options: {
      cacheDuration: 60,
    },
  },
  {
    handlerName: 's3',
    path: '/s3/:file*',
    options: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: 'eu-north-1',
      bucket: 'cloudproxy-test',
      path: '{file}',
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
    handlerName: 'custom',
    path: '/custom',
    options: {},
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
    handlerName: 'kvStorage',
    path: '/kvStorage/:file*',
    options: {
      kvAccountId: process.env.KV_ACCOUNT_ID,
      kvNamespace: process.env.KV_NAMESPACE_TEMPLATES,
      kvAuthEmail: process.env.KV_AUTH_EMAIL,
      kvAuthKey: process.env.KV_AUTH_KEY,
      kvKey: '{file}',
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
  // {
  //   handlerName: 'apiKey',
  //   path: '/oauth2/.*',
  //   options: {
  //     oauth2ClientId: process.env.OAUTH2_CLIENT_ID,
  //     oauth2ClientSecret: process.env.OAUTH2_CLIENT_SECRET,
  //     oauth2AuthDomain: process.env.OAUTH2_AUTH_DOMAIN,
  //     kvAccountId: process.env.KV_ACCOUNT_ID,
  //     kvNamespace: process.env.KV_NAMESPACE,
  //     kvAuthEmail: process.env.KV_AUTH_EMAIL,
  //     kvAuthKey: process.env.KV_AUTH_KEY,
  //   },
  // },
  {
    handlerName: 'oauth2',
    path: '/oauth2/.*',
    options: {
      oauth2ClientId: process.env.OAUTH2_CLIENT_ID,
      oauth2ClientSecret: process.env.OAUTH2_CLIENT_SECRET,
      oauth2AuthDomain: process.env.OAUTH2_AUTH_DOMAIN,
      oauth2Audience: process.env.OAUTH2_AUDIENCE,
      oauth2CallbackPath: '/oauth2/callback',
      oauth2LogoutPath: '/oauth2/logout',
      oauth2LoginPath: '/oauth2/login',
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

const proxy = new Proxy(rules, {
  custom: (options) => {
    return async (ctx) => {
      ctx.status = 200;
      ctx.body = 'Custom handler';
    };
  },
});

/**
 * Fetch and log a given request object
 * @param {Request} options
 */
async function handler(event) {
  return proxy.resolve(event);
}

module.exports = handler;
