const cacheService = require('../services/cache');

function cacheFactory({ cacheDuration }) {
  return async (ctx, next) => {
    try {
      const cachedResponse = await cacheService.get(ctx.event.request);

      if (cachedResponse) {
        ctx.body = cachedResponse.body;
        ctx.status = cachedResponse.status;
        Object.keys(cachedResponse.headers).forEach((key) => {
          ctx.set(key, cachedResponse.headers[key]);
        });
        ctx.set('X-Cache-Hit', true);
      } else {
        await next(ctx);

        const headerOverride = {};

        if (cacheDuration) {
          headerOverride['Cache-Control'] = `max-age=${cacheDuration}`;
        }

        let clonedBody;

        if (ctx.body.tee) {
          [ctx.body, clonedBody] = ctx.body.tee();
        } else {
          clonedBody = ctx.body;
        }

        const response = new Response(clonedBody, {
          status: ctx.status,
          headers: {
            ...ctx.response.headers,
            ...headerOverride,
          },
        });

        ctx.event.waitUntil(cacheService.set(ctx.request, response));
      }
    } catch (err) {
      ctx.body = err.message;
      ctx.status = 200;
    }
  };
}

module.exports = cacheFactory;
