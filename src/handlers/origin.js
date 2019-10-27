const lodashGet = require('lodash.get');
const constants = require('../constants');

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
  const { localOriginOverride } = options;

  return async (ctx) => {
    const url = process.env.LOCAL
      ? `${localOriginOverride || ctx.request.origin}${ctx.request.path}`
      : ctx.request.href;

    const requestOptions = {
      headers: filterCfHeaders(ctx.request.headers),
      method: ctx.request.method,
      redirect: 'manual',
    };

    if (
      constants.methodsMethodsWithBody.indexOf(cxt.request.method) !== -1 &&
      _.get(ctx, 'event.request.body')
    ) {
      const clonedRequest = ctx.event.request.clone();
      requestOptions.body = clonedRequest.body;
    }

    // eslint-disable-next-line no-undef
    const response = await fetch(url, requestOptions);

    ctx.body = response.body;
    ctx.status = response.status;
    const responseHeaders = instanceToJson(response.headers);
    Object.keys(responseHeaders).forEach((key) => {
      ctx.set(key, responseHeaders[key]);
    });
  };
};
