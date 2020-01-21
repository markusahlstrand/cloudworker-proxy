const cookie = require('cookie');
const KvStorage = require('../services/kvStorage');
const jwtRefresh = require('./jwt-refresh');
const get = require('lodash.get');

const _ = {
  get,
};

function getCookie({ cookieHeader = '', cookieName }) {
  const cookies = cookie.parse(cookieHeader);
  return cookies[cookieName];
}

/**
 * Very simplistic form serializer that works for this case but probably nothing else :)
 * @param {*} obj
 */
function serializeFormData(obj) {
  return Object.keys(obj)
    .map((key) => `${key}=${encodeURIComponent(obj[key])}`)
    .join('&');
}

function isBrowser(accept = '') {
  return accept.split(',').indexOf('text/html') !== -1;
}

module.exports = function oauth2Handler({
  cookieName = 'proxy',
  allowPublicAccess = false,
  kvAccountId,
  kvNamespace,
  kvAuthEmail,
  kvAuthKey,
  kvTtl = 2592000, // A month
  oauth2AuthDomain,
  oauthClientId,
  oauth2ClientSecret,
  oauth2Audience,
  oauth2Scopes,
  oauth2CallbackPath = '/callback',
  oauth2LogoutPath = '/logout',
  oauth2LoginPath = '/login',
  oauth2ServerTokenPath = '/oauth/token',
  oauth2ServerAuthorizePath = '',
  oauth2ServerLogoutPath,
}) {
  const kvStorage = new KvStorage({
    accountId: kvAccountId,
    namespace: kvNamespace,
    authEmail: kvAuthEmail,
    authKey: kvAuthKey,
    ttl: kvTtl,
  });

  const authDomain = oauth2AuthDomain;
  const callbackPath = oauth2CallbackPath;
  const serverTokenPath = oauth2ServerTokenPath;
  const serverAuthorizePath = oauth2ServerAuthorizePath;
  const serverLogoutPath = oauth2ServerLogoutPath;
  const clientId = oauthClientId;
  const clientSecret = oauth2ClientSecret;
  const audience = oauth2Audience;
  const logoutPath = oauth2LogoutPath;
  const loginPath = oauth2LoginPath;
  const scopes = oauth2Scopes;
  const scope = scopes.join('%20');

  async function getTokenFromCode(code, redirectUrl) {
    const tokenUrl = `${authDomain}${serverTokenPath}`;

    // eslint-disable-next-line no-undef
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: serializeFormData({
        code,
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUrl,
      }),
    });

    if (!response.ok) {
      throw new Error('Authentication failed');
    }

    return response.json();
  }

  async function handleLogout(ctx) {
    const sessionCookie = getCookie({
      cookieHeader: ctx.request.headers.cookie,
      cookieName,
    });

    const domain = ctx.request.hostname.match(/[^.]+\.[^.]+$/i)[0];

    if (sessionCookie) {
      // Remove the cookie
      ctx.set(
        'Set-Cookie',
        cookie.serialize(cookieName, '', {
          domain: `.${domain}`,
          path: '/',
          maxAge: 0,
        }),
      );
    }

    const returnToPath = getRedirectTo(ctx);

    if (oauth2ServerLogoutPath) {
      const returnTo = encodeURIComponent(
        `${ctx.request.protocol}://${ctx.request.host}${returnToPath}`,
      );
      // Bounce to remove cookie at the oauth server
      ctx.set(
        'Location',
        `${authDomain}${serverLogoutPath}?client_id=${clientId}&returnTo=${returnTo}`,
      );
    } else {
      ctx.set('Location', returnToPath);
    }

    ctx.status = 302;
  }

  function splitKey(key) {
    const segments = key.split('.');

    // Dirty check to see if it's a jwt
    if (segments.length === 3) {
      return {
        client: accessTokenSegments.pop(),
        server: `${accessTokenSegments.join('.')}.`,
      };
    }

    const keySplitIndex = Math.floor(key.length / 2);

    return {
      client: key.slice(keySplitIndex),
      server: key.slice(0, keySplitIndex),
    };
  }

  function splitAuthData(authData) {
    const accessTokenSplit = splitKey(authData.accessToken);
    const refreshTokenSplit = splitKey(authData.refreshToken);

    const key = `${accessTokenSplit.client}.${refreshTokenSplit.server}`;

    return {
      serverAuthData: {
        accessToken: accessTokenSplit.server,
        refreshToken: refreshTokenSplit.server,
        expires: authData.expires,
      },
      key,
    };
  }

  async function handleCallback(ctx) {
    const redirectUrl = ctx.request.href.split('?')[0];

    const body = await getTokenFromCode(ctx.request.query.code, redirectUrl);

    const { serverAuthData, key } = splitAuthData({
      accessToken: body.access_token,
      refreshToken: body.refresh_token,
      expires: Date.now() + body.expires_in * 1000,
    });

    await kvStorage.put(key, JSON.stringify(serverAuthData));

    const domain = ctx.request.hostname.match(/[^.]+\.[^.]+$/i)[0];

    ctx.status = 302;
    ctx.set(
      'Set-Cookie',
      cookie.serialize(cookieName, key, {
        domain: `.${domain}`,
        path: '/',
        maxAge: 60 * 60 * 24 * 365, // 1 year
      }),
    );
    ctx.set('Location', ctx.request.query.state);
  }

  /**
   * Try to set a bearer based on the session cookie
   * @param {*} ctx
   * @param {*} sessionCookie
   */
  async function getSession(ctx, sessionCookie) {
    const session = await kvStorage.get(sessionCookie);

    if (session) {
      let authData = JSON.parse(session);
      const [accessPart, refreshPart] = sessionCookie.split('.');

      // Store this in the state as other handlers might need it..
      ctx.state.refreshToken = authData.refreshToken + refreshPart;

      if (authData.expires < Date.now()) {
        const refreshedJwt = await jwtRefresh({
          refreshToken: ctx.state.refreshToken,
          clientId,
          authDomain,
          clientSecret,
        });

        const { key, serverAuthData } = splitAuthData(refreshedJwt);

        authData = serverAuthData;

        const domain = ctx.request.hostname.match(/[^.]+\.[^.]+$/i)[0];

        await kvStorage.put(key, JSON.stringify(serverAuthData));
        ctx.set(
          'Set-Cookie',
          cookie.serialize(cookieName, key, {
            domain: `.${domain}`,
            maxAge: 60 * 60 * 24 * 365, // 1 year
          }),
        );
      }

      ctx.state.accessToken = authData.accessToken + accessPart;
      ctx.state.accessTokenExpires = authData.expires;

      ctx.request.headers.authorization = `bearer ${ctx.state.accessToken}`;
    } else {
      // Remove the cookie if the session can't be found in the kv-store
      const domain = ctx.request.hostname.match(/[^.]+\.[^.]+$/i)[0];
      // Remove the cookie
      ctx.set(
        'Set-Cookie',
        cookie.serialize(cookieName, '', {
          domain: `.${domain}`,
          maxAge: 0,
        }),
      );
    }
  }

  function getRedirectTo(ctx) {
    const redirectTo = _.get(ctx, 'request.query.redirect-to');
    if (redirectTo) {
      return redirectTo;
    }

    const referer = _.get(ctx, 'request.headers.referer');
    const baseUrl = `${ctx.request.protocol}://${ctx.request.host}`;
    if (referer && referer.startsWith(baseUrl)) {
      return referer.replace(baseUrl, '');
    }

    // Default to the root
    return '/';
  }

  /**
   * Explicitly logins a user
   * @param {*} ctx
   * @param {*} next
   */
  async function handleLogin(ctx) {
    // Options requests should return a 200
    if (ctx.request.method === 'OPTIONS') {
      ctx.status = 200;
    } else {
      const redirectTo = getRedirectTo(ctx);

      const state = encodeURIComponent(redirectTo || '/');
      const encodedRedirectUri = encodeURIComponent(
        `${ctx.request.protocol}://${ctx.request.host}${callbackPath}`,
      );

      ctx.status = 302;
      ctx.set(
        'location',
        `${authDomain}${serverAuthorizePath}/authorize?state=${state}&client_id=${clientId}&response_type=code&scope=${scope}&audience=${audience}&redirect_uri=${encodedRedirectUri}`,
      );
    }
  }

  /**
   * Validates the request based on bearer token and cookie
   * @param {*} ctx
   * @param {*} next
   */
  async function handleValidate(ctx, next) {
    // If the request has a auth-header, use this and pass on.
    // Options requests should not be authenticated. Requests with auth headers are passed through
    if (ctx.request.headers.authorization || ctx.request.method === 'OPTIONS') {
      if (ctx.request.headers.authorization.toLowerCase().startsWith('bearer ')) {
        ctx.state.accessToken = ctx.request.headers.authorization.slice(7);
      }

      await next(ctx);
    } else {
      const sessionCookie = getCookie({
        cookieHeader: ctx.request.headers.cookie,
        cookieName,
      });

      // If the client didn't supply a bearer token, try to fetch one based on the cookie
      if (!sessionCookie) {
        await getSession(ctx, sessionCookie);
      }

      if (allowPublicAccess) {
        await next(ctx);
      } else {
        if (isBrowser(ctx.request.headers.accept)) {
          // For now we just code the requested url in the state. Could pass more properties in a serialized object
          const state = encodeURIComponent(ctx.request.href);
          const encodedRedirectUri = encodeURIComponent(
            `${ctx.request.protocol}://${ctx.request.host}${callbackPath}`,
          );

          ctx.status = 302;
          ctx.set(
            'location',
            `${authDomain}${serverAuthorizePath}/authorize?state=${state}&client_id=${clientId}&response_type=code&scope=${scope}&audience=${audience}&redirect_uri=${encodedRedirectUri}`,
          );
        } else {
          ctx.status = 403;
          ctx.body = 'Forbidden';
        }
      }
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
      case loginPath:
        await handleLogin(ctx);
        break;
      default:
        await handleValidate(ctx, next);
    }
  };
};
