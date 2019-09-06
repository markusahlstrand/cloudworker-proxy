async function handleCreateKey(ctx) {
    ctx.body = 'User: ' + JSON.stringify(ctx.state);
    ctx.status = 200;
}

module.exports = function apikeyApiHandler({
    createPath = '/apikeys'
 }) {
    return async (ctx, next) => {
        switch (ctx.request.path) {
            case createPath:
                await handleCreateKey(ctx);
                break;
            default:
                return next(ctx);
        }
    };
};
