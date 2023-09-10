import Router from 'cloudworker-router';
import defaultHandlers from './handlers';

interface Rule {
  path: string;
  method: string;
  handlerName: string;
  options?: object;
}

module.exports = class Proxy {
  router: Router;

  constructor(rules: Rule[] = [], handlers = {}) {
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
