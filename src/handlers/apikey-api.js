const shortId = require('shortid');

const hash = require('../encryption/hash');
const KvStorage = require('../services/kvStorage');

module.exports = function apikeyApiHandler({
    createPath = '/apikeys',
    kvAccountId,
    kvNamespace,
    kvAuthEmail,
    kvAuthKey,
    kvTtl = 2592000, // A month
    kvPrefix = 'apikeys-',
 }) {
    const kvStorage = new KvStorage({
        accountId: kvAccountId,
        namespace: kvNamespace,
        authEmail: kvAuthEmail,
        authKey: kvAuthKey,
        ttl: kvTtl,
    });

    async function handleCreateKey(ctx, next) {
        if (ctx.request.method !== 'POST') {
            return next(ctx);
        }

        const userHash = await hash(ctx.user.sub);
        const kvKey = kvPrefix + userHash;
        const apiKeys = JSON.parse(await kvStorage.get(kvKey) || '{}');

        const apikey = shortId();
        apiKeys[apikey] = {
            accessToken: ctx.state.accessToken,
            accessTokenExpires: ctx.state.accessTokenExpires,
            refreshToken: ctx.state.refreshToken,
        };

        await kvStorage.put(kvKey, JSON.stringify(apiKeys));

        ctx.body = JSON.stringify({
            apikey: `${userHash}.${apikey}`,
        });
        ctx.status = 201;
    }

    return async (ctx, next) => {
        switch (ctx.request.path) {
            case createPath:
                await handleCreateKey(ctx, next);
                break;
            default:
                return next(ctx);
        }
    };
};
