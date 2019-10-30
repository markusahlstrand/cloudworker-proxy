const Router = require('cloudworker-router');
const handlers = require('./handlers');

module.exports = class Proxy {
  constructor(rules = []) {
    this.router = new Router();

    rules.forEach((rule) => {
      const handler = handlers[rule.handlerName];

      if (!handler) {
        throw new Error(`Handler ${rule.handlerName} is not supported`);
      }

      this.router.add(rule, handler(rule.options));
    });
  }

  async resolve(event) {
    return this.router.resolve(event);
  }
};
