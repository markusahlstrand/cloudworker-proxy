const lodashGet = require('lodash.get');

const _ = {
  get: lodashGet,
};

const HttpLogger = require('../loggers/http');

module.exports = function logger(options) {
  let logService;

  switch (options.type) {
    case 'http':
      logService = new HttpLogger(options);
      break;
    default:
      throw new Error(`Log service type not supported: ${options.type}`);
  }

  return async (ctx, next) => {
    ctx.state['logger-startDate'] = new Date();

    try {
      await next(ctx);

      const data = {
        message: 'START',
        requestIp: _.get(ctx, 'request.headers.x-real-ip'),
        requestId: _.get(ctx, 'request.requestId'),
        request: {
          headers: _.get(ctx, 'request.headers'),
          method: _.get(ctx, 'request.method'),
          url: _.get(ctx, 'request.href'),
          //   body,
        },
        response: {
          status: ctx.status,
          headers: ctx.headers,
        },
        route: _.get(ctx, 'route.handlerName'),
        timestamp: new Date().toISOString(),
        ttfb: new Date() - ctx.state['logger-startDate'],
        redirectUrl: ctx.userRedirect,
      };

      logService.log(data);
    } catch (err) {
      console.log(err.message);
    }
  };
};
