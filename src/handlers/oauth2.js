const cookie = require('cookie');
const KvStorage = require('../services/kvStorage');
// const base64Utils = require('../utils/base64');

async function handleCallback(ctx) {
  ctx.status = 200;
  ctx.body = 'HandleCallback';
}

async function handleLogout(ctx) {
  ctx.status = 200;
  ctx.body = 'HandleCallback';
}

function isBrowser(accept = '') {
  return accept.split(',').indexOf('text/html') !== -1;
}

// async function redirectToLogin(ctx) {
//   ctx.status = 302;
//   ctx.set('Location', 'https://www.google.com');
// }

module.exports = function oauth2Handler({
  callbackPath = '/callback',
  logoutPath = '/logout',
  cookieName = 'proxy',
  kvAccountId,
  kvNamespace,
  kvAuthEmail,
  kvAuthKey,
  kvTtl,
}) {
  const kvStorage = new KvStorage({
    accountId: kvAccountId,
    namespace: kvNamespace,
    authEmail: kvAuthEmail,
    authKey: kvAuthKey,
    ttl: kvTtl,
  });

  /**
   * Validates the request based on bearer token and cookie
   * @param {*} ctx
   * @param {*} next
   */
  async function handleValidate(ctx, next) {
    // Options requests should not be authenticated
    if (ctx.request.method === 'OPTIONS') {
      return true;
    }

    const authHeader = ctx.request.headers.authentication || '';
    if (authHeader.toLowerCase().startsWith('bearer')) {
      throw new Error('Not implemented');
    }

    const cookieHeader = ctx.request.headers.cookie || '';
    const cookies = cookie.parse(cookieHeader);
    const sessionCookie = cookies[cookieName];
    if (sessionCookie) {
      const session = await kvStorage.get(sessionCookie);

      return next(ctx);
    }

    if (isBrowser(ctx.request.headers.accept)) {
      ctx.status = 302;
      ctx.set('location', 'https://www.google.com');
    } else {
      ctx.status = 403;
    }
  }

  return async (ctx, next) => {
    switch (ctx.request.path) {
      case callbackPath:
        await handleCallback(ctx);
        break;
      case logoutPath:
        await handleLogout(ctx);
        break;
      default:
        await handleValidate(ctx, next);
    }
  };
};
