const Router = require('cloudworker-router');
const handlers = require('./handlers');

module.exports = class Proxy {
  constructor(rules = []) {
    this.router = new Router();

    rules.forEach((rule) => {
      const handler = handlers[rule.name];

      if (!handler) {
        throw new Error(`Handler ${rule.name} is not supported`);
      }

      this.router.add(rule, handler(rule.options));
    });
  }

  async resolve(event) {
    return this.router.resolve(event);
  }
};
