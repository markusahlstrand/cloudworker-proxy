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
    handlerName: 'origin',
    path: '/hello.html',
    options: {
      localOriginOverride: 'https://static.ahlstrand.es',
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
