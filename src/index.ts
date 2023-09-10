import Router from 'cloudworker-router';
import defaultHandlers from './handlers';

module.exports = class Proxy {
  constructor(rules = [], handlers = {}) {
    this.router = new Router();

    rules.forEach((rule) => {
      const handler = handlers[rule.handlerName] || defaultHandlers[rule.handlerName];

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
