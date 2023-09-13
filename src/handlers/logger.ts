import lodashGet from 'lodash.get';
import packageJson from '../../package.json';
import HttpLogger from '../loggers/http';
import KinesisLogger from '../loggers/kinesis';

const _ = {
  get: lodashGet,
};

/**
 * Returns the first 10 KB of the body
 * @param {*} ctx
 */
async function getBody(request) {
  if (['POST', 'PATCH'].indexOf(request.method) === -1) {
    return null;
  }

  return request.text();
}

export default function logger(options) {
  let logService;

  switch (options.type) {
    case 'http':
      logService = new HttpLogger(options);
      break;
    case 'kinesis':
      logService = new KinesisLogger(options);
      break;
    default:
      throw new Error(`Log service type not supported: ${options.type}`);
  }

  return async (ctx, next) => {
    ctx.state['logger-startDate'] = new Date();
    const body = await getBody(ctx.request);

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
          protocol: _.get(ctx, 'request.protocol'),
          body,
        },
        response: {
          status: ctx.status,
          headers: _.get(ctx, 'response.headers'),
        },
        handlers: _.get(ctx, 'state.handlers', []).join(','),
        route: _.get(ctx, 'route.name'),
        timestamp: new Date().toISOString(),
        ttfb: new Date() - ctx.state['logger-startDate'],
        redirectUrl: ctx.userRedirect,
        severity: 30,
        proxyVersion: packageJson.version,
      };

      ctx.event.waitUntil(logService.log(data));
    } catch (err) {
      const errData = {
        request: {
          headers: _.get(ctx, 'request.headers'),
          method: _.get(ctx, 'request.method'),
          handlers: _.get(ctx, 'state.handlers', []).join(','),
          url: _.get(ctx, 'request.href'),
          body,
        },
        message: 'ERROR',
        stack: err.stack,
        error: err.message,
        severity: 50,
        proxyVersion: packageJson.version,
      };

      ctx.event.waitUntil(logService.log(errData));
    }
  };
}
