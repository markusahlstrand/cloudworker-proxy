import cacheService from '../services/cache';
import hash from '../encryption/hash';
import { instanceToJson } from '../utils';

const defaultHeaderBlacklist = [
  'x-ratelimit-count',
  'x-ratelimit-limit',
  'x-ratelimit-reset',
  'x-cache-hit',
];

async function getBody(request) {
  if (['POST', 'PATCH'].indexOf(request.method) === -1) {
    return null;
  }

  return request.text();
}

async function getCacheKey(ctx, cacheKeyTemplate) {
  if (!cacheKeyTemplate) {
    return ctx.event.request;
  }

  const cacheKeys = cacheKeyTemplate.match(/{.*?}/gi).map((key) => key.slice(1, -1));
  const cacheKeyValues = {};

  for (let i = 0; i < cacheKeys.length; i += 1) {
    const cacheKey = cacheKeys[i];
    const segments = cacheKey.split(':');

    switch (segments[0]) {
      case 'method':
        cacheKeyValues[cacheKey] = ctx.request.method;
        break;
      case 'path':
        cacheKeyValues[cacheKey] = ctx.request.path;
        break;
      case 'bodyHash':
        // eslint-disable-next-line no-await-in-loop
        cacheKeyValues[cacheKey] = await hash(await getBody(ctx.request));
        break;
      case 'header':
        cacheKeyValues[cacheKey] = ctx.request.headers[segments[1]] || '';
        break;
      default:
        cacheKeyValues[cacheKey] = cacheKey;
    }
  }

  const cacheKeyPath = encodeURIComponent(
    cacheKeyTemplate.replace(/({(.*?)})/gi, ($0, $1, key) => {
      return cacheKeyValues[key];
    }),
  );

  return new Request(`http://${ctx.request.hostname}/${cacheKeyPath}`);
}

export default function cacheFactory({
  cacheDuration,
  cacheKeyTemplate,
  headerBlacklist = defaultHeaderBlacklist,
}) {
  return async (ctx, next) => {
    const cacheKey = await getCacheKey(ctx, cacheKeyTemplate);

    const cachedResponse = await cacheService.get(cacheKey);

    if (cachedResponse) {
      ctx.body = cachedResponse.body;
      ctx.status = cachedResponse.status;

      const headers = instanceToJson(cachedResponse.headers);

      Object.keys(headers).forEach((key) => {
        ctx.set(key, headers[key]);
      });
      ctx.set('X-Cache-Hit', true);
    } else {
      await next(ctx);

      let clonedBody;

      if (ctx.body.tee) {
        [ctx.body, clonedBody] = ctx.body.tee();
      } else {
        clonedBody = ctx.body;
      }

      const response = new Response(clonedBody, {
        status: ctx.status,
      });

      Object.keys(ctx.response.headers).forEach((header) => {
        if (headerBlacklist.indexOf(header.toLowerCase()) === -1) {
          response.headers.set(header, ctx.response.headers[header]);
        }
      });

      if (cacheDuration) {
        response.headers.delete('Cache-Control');
        response.headers.set('Cache-Control', `max-age=${cacheDuration}`);
      }

      ctx.event.waitUntil(cacheService.set(cacheKey, response));
    }
  };
}
