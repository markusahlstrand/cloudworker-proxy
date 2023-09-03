const get = require('lodash.get');

const KvStorage = require('../services/kv-storage');

const _ = {
  get,
};

function apiKeys({
  createPath = '/api-keys',
  kvAccountId,
  kvNamespace,
  kvAuthEmail,
  kvAuthKey,
  //   kvKeySeparator = '|',
  //   kvPrefix = 'api-keys',
  //   appKeyPrefix = 'APIKEY',
  //   appKeyHashSecret = 'ReplaceThisStringWithValueSecret',
}) {
  const kvStorage = new KvStorage({
    accountId: kvAccountId,
    namespace: kvNamespace,
    authEmail: kvAuthEmail,
    authKey: kvAuthKey,
  });

  async function handleKeys(ctx) {
    const userId = _.get(ctx, 'state.user.id');
    if (!userId) {
      ctx.status = 403;
      ctx.body = 'Forbidden';
    }
  }

  async function handleValidateKey(ctx, next) {
    const apiKey = _.get(ctx, 'request.headers.x-api-key');
    if (!apiKey) {
      return next(ctx);
    }

    const data = await kvStorage.get(apiKey);
    if (!data) {
      ctx.status = 403;
      ctx.body = 'Invalid api key';
      return ctx;
    }

    ctx.state.user = JSON.parse(data);
    return next(ctx);
  }

  return async function apiKeysHandler(ctx, next) {
    switch (ctx.request.path) {
      case createPath:
        return handleKeys(ctx, next);
      default:
        return handleValidateKey(ctx, next);
    }
  };
}

module.exports = apiKeys;
