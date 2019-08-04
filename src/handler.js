const Router = require('cloudworker-router');

const router = new Router();

/**
 * Fetch and log a given request object
 * @param {Request} options
 */
function handler(event) {
  router.get('/', async (ctx) => {
      ctx.body = 'Hello World';
      ctx.status = 200;
  });
}

module.exports = handler;
