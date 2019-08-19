const Proxy = require("../src/index");

const rules = [
  {
    handlerName: 'logger',
    options: {
      type: 'http',
      url: process.env.LOGZ_URL,
      contentType: 'text/plain',
      delimiter: '_',      
    },
  },
  {
    handlerName: "static",
    options: {
      body: "Hello world"
    }
  }
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
