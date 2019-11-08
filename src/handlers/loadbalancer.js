const lodashGet = require('lodash.get');
const lodashSet = require('lodash.set');
const cachedFetch = require('../services/cachedFetch');
const constants = require('../constants');

const _ = {
  get: lodashGet,
  set: lodashSet,
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

function getSource(sources) {
  // Random for now. Maybe support sticky sessions, least connected or fallback
  return sources[Math.floor(Math.random() * sources.length)];
}

function resolveParams(url, params = {}) {
  return Object.keys(params).reduce((acc, key) => acc.replace(`{${key}}`, params[key]), url);
}

function instanceToJson(instance) {
  return [...instance].reduce((obj, item) => {
    const prop = {};
    // eslint-disable-next-line prefer-destructuring
    prop[item[0]] = item[1];
    return { ...obj, ...prop };
  }, {});
}

module.exports = function loadbalancerHandler({ sources = [], cacheOverride }) {
  return async (ctx) => {
    const source = getSource(sources);

    const options = {
      method: ctx.request.method,
      headers: filterCfHeaders(ctx.request.headers),
      redirect: 'manual',
      cacheOverride,
    };

    if (
      constants.methodsMethodsWithBody.indexOf(ctx.request.method) !== -1 &&
      _.get(ctx, 'event.request.body')
    ) {
      const clonedRequest = ctx.event.request.clone();
      options.body = clonedRequest.body;
    }

    const url = resolveParams(source.url, ctx.params);

    if (source.resolveOverride) {
      const resolveOverride = resolveParams(source.resolveOverride, ctx.request.params);
      // Cloudflare header to change host.
      // Only possible to add proxied cf dns within the same account.
      _.set(options, 'cf.resolveOverride', resolveOverride);
    }

    const response = await cachedFetch(url + ctx.request.search, options);

    ctx.body = response.body;
    ctx.status = response.status;
    const responseHeaders = instanceToJson(response.headers);
    Object.keys(responseHeaders).forEach((key) => {
      ctx.set(key, responseHeaders[key]);
    });
  };
};
