import get from 'lodash.get';

const _ = {
  get,
};

function setUnauthorizedResponse(ctx) {
  ctx.status = 401;
  ctx.body = 'Unauthorized';
  ctx.set('WWW-Authenticate', 'Basic');
}

/**
 * Applies authentication on the request
 * @param {*} ctx
 * @param {*} next
 */
export default function basicAuth(options) {
  return async (ctx, next) => {
    // Forces a new login which is the closest you can get to a logout with basic auth
    if (ctx.request.path === options.logoutPath) {
      return setUnauthorizedResponse(ctx);
    }

    const authHeaders = _.get(ctx, 'request.headers.authorization');
    if (!authHeaders || !authHeaders.startsWith('Basic ')) {
      return setUnauthorizedResponse(ctx);
    }

    const userTokens = options.users.map((user) => user.authToken);

    const authToken = authHeaders.substring(6);
    const userIndex = userTokens.indexOf(authToken);
    if (userIndex === -1) {
      return setUnauthorizedResponse(ctx);
    }

    ctx.state.user = options.users[userIndex].username;

    return next(ctx);
  };
}
