const lodashGet = require('lodash.get');
const lodashSet = require('lodash.set');

const _ = {
  get: lodashGet,
  set: lodashSet,
};

module.exports = function rateLimitHandler({ type = 'IP', scope = 'default', limit = 1000 }) {
  const buckets = {};

  function getKey(currentMinute, headers) {
    const ip = headers['x-real-ip'];

    if (type === 'IP') {
      return `minute.${currentMinute}.${scope}.${ip}`;
    }

    return `minute.${currentMinute}.${scope}.account`;
  }

  function cleanUp(currentMinute) {
    const minutes = _.get(buckets, 'minutes', {});
    Object.keys(minutes).forEach((minute) => {
      if (minute !== currentMinute) {
        delete buckets.minutes.minute;
      }
    });
  }

  return async (ctx, next) => {
    const currentMinute = Math.trunc(Date.now() / (1000 * 60));
    const reset = Math.trunc(currentMinute * 60 + 60 - Date.now() / 1000);

    const key = getKey(currentMinute, ctx.request.headers);

    let count = _.get(buckets, key, 0);

    // Don't count head and options reqests
    if (['HEAD', 'OPTIONS'].indexOf(ctx.request.method) === -1) {
      count += 1;
    }

    ctx.set('X-Ratelimit-Limit', limit);
    ctx.set('X-Ratelimit-Count', count);
    ctx.set('X-Ratelimit-Reset', reset);

    _.set(buckets, key, count);

    if (limit < count) {
      ctx.status = 429;
      return;
    }

    cleanUp(currentMinute);

    await next(ctx);
  };
};
