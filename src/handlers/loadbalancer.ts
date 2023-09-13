import lodashGet from 'lodash.get';
import lodashSet from 'lodash.set';
import constants from '../constants';
import utils from '../utils';

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

export default function loadbalancerHandler({ sources = [] }) {
  return async (ctx) => {
    const source = getSource(sources);

    const options = {
      method: ctx.request.method,
      headers: filterCfHeaders(ctx.request.headers),
      redirect: 'manual',
      // Allow other handlers to add cloudflare headers to the request
      cf: ctx.request.cf,
    };

    if (
      constants.methodsMethodsWithBody.indexOf(ctx.request.method) !== -1 &&
      _.get(ctx, 'event.request.body')
    ) {
      const clonedRequest = ctx.event.request.clone();
      options.body = clonedRequest.body;
    }

    const url = utils.resolveParams(source.url, ctx.params);

    if (source.resolveOverride) {
      const resolveOverride = utils.resolveParams(source.resolveOverride, ctx.request.params);
      // Cloudflare header to change host.
      // Only possible to add proxied cf dns within the same account.
      _.set(options, 'cf.resolveOverride', resolveOverride);
    }

    const response = await fetch(url + ctx.request.search, options);

    ctx.body = response.body;
    ctx.status = response.status;
    const responseHeaders = utils.instanceToJson(response.headers);
    Object.keys(responseHeaders).forEach((key) => {
      ctx.set(key, responseHeaders[key]);
    });
  };
}
