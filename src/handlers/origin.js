const lodashGet = require('lodash.get');
const cachedFetch = require('../services/cachedFetch');

const _ = {
  get: lodashGet,
};

function filterCfHeaders(headers) {
  const result = {};

  Object.keys(headers).forEach((key) => {
    if (!key.startsWith('cf')) {
      result[key] = headers[key];
    }
  });

  return result;
}

function instanceToJson(instance) {
  return [...instance].reduce((obj, item) => {
    const prop = {};
    // eslint-disable-next-line prefer-destructuring
    prop[item[0]] = item[1];
    return { ...obj, ...prop };
  }, {});
}

module.exports = function originHandler(options) {
  const { localOriginOverride, cached = true } = options;

  return async (ctx) => {
    const url = process.env.LOCAL
      ? `${localOriginOverride || ctx.request.origin}${ctx.request.path}`
      : ctx.request.href;

    const requestOptions = {
      headers: filterCfHeaders(ctx.request.headers),
      method: ctx.request.method,
      redirect: 'manual',
      cached,
    };

    if (_.get(ctx, 'event.request.body')) {
      requestOptions.body = ctx.event.request.body;
    }

    const response = await cachedFetch(url, requestOptions);

    // Only stream the body for non-cloned requests
    if (!ctx.cloned && response.body !== null) {
      // eslint-disable-next-line no-undef
      const { readable, writable } = new TransformStream();

      // Don't await..
      ctx.event.waitUntil(response.body.pipeTo(writable));

      ctx.body = readable;
    }

    ctx.status = response.status;
    const responseHeaders = instanceToJson(response.headers);
    Object.keys(responseHeaders).forEach((key) => {
      ctx.set(key, responseHeaders[key]);
    });
  };
};
