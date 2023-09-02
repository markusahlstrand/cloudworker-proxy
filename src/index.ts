import { Hono } from 'hono';
import { Rule } from './types/Rule';

export function registerRoutes(router: Hono, rules: Rule[]) {
  rules.forEach((rule) => {
    switch (rule.methods) {
      case 'GET':
        router.get(rule.path, rule.handler);
    }
    //       const handler = handlers[rule.handlerName] || defaultHandlers[rule.handlerName];
    //       if (!handler) {
    //         throw new Error(`Handler ${rule.handlerName} is not supported`);
    //       }
    //       this.router.add(rule, handler(rule.options));
    //     });
  });
}
