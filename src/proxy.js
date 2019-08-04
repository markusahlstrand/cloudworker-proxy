const Router = require('cloudworker-router');
const handlers = require('./handlers');

module.exports = class Proxy {
    constructor(rules = []) {
        // Add the rules

        this.router = new Router();

        rules.forEach(rule => {
            const handler = handlers[rule.name];

            if (!handler) {
                return;
            }

            handler.register(router);
        })
    }

    resolve(event) {
        return this.router.resolve(event);
    }
};
