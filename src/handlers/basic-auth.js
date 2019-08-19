const _ = {
  get: require("lodash.get"),
  set: require("lodash.set")
};

function setUnauthorizedResponse(ctx) {
    ctx.status = 401;
    ctx.body = 'Unauthorized',
    ctx.set('WWW-Authenticate', 'Basic');
}

/**
 * Applies authentication on the request
 * @param {*} ctx
 * @param {*} next
 */
function basicAuth(options) {
  return async (ctx, next) => {
    const authHeaders = ctx.request.headers.get('authorization');
    if (!authHeaders || !authHeaders.startsWith("Basic ")) {        
      return setUnauthorizedResponse(ctx);
    }

    const userTokens = options.users.map(user => user.authToken);

    const authToken = authHeaders.substring(6);
    const userIndex = userTokens.indexOf(authToken);
    if (userIndex == -1) {
        return setUnauthorizedResponse(ctx);
    }

    ctx.state.user = options.users[userIndex].username;

    return await next(ctx);
  };
}

module.exports = basicAuth;
