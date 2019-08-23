const lodashGet = require('lodash.get');
const lodashSet = require('lodash.set');

const _ = {
  get: lodashGet,
  set: lodashSet,
};

function getSource(sources) {
  // Random for now. Maybe support sticky sessions, least connected or fallback
  return sources[Math.floor(Math.random() * sources.length)];
}

function resolveParams(url, params = {}) {
  return Object.keys(params).reduce((acc, key) => acc.replace(`{${key}}`, params[key]), url);
}

module.exports = function loadbalancerHandler({ sources = [] }) {
  return async (ctx) => {
    const source = getSource(sources);

    const options = {
      method: ctx.request.method,
      headers: ctx.request.headers,
    };

    if (_.get(ctx, 'event.request.body')) {
      options.body = ctx.event.request.body;
    }

    const url = resolveParams(source.url, ctx.params);

    if (source.resolveOverride) {
      const resolveOverride = resolveParams(source.resolveOverride, ctx.request.params);
      // Cloudflare header to change host. Only possible to add proxied cf dns within the same account
      _.set(options, 'cf.resolveOverride', resolveOverride);
    }

    // eslint-disable-next-line no-undef
    const response = await fetch(url + ctx.request.querystring, options);

    // eslint-disable-next-line no-undef
    const { readable, writable } = new TransformStream();

    // Don't await..
    response.body.pipeTo(writable);

    ctx.body = readable;
    ctx.status = response.status;
    ctx.headers = { ...ctx.headers, ...response.headers };
  };
};
