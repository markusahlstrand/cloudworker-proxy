import cookie from 'cookie';
import get from 'lodash.get';
import set from 'lodash.set';
import shortid from 'shortid';
import KvStorage from '../services/kv-storage';
import jwtRefresh from './jwt-refresh';
import aes from '../encryption/aes';

const _ = {
  get,
  set,
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

export default function oauth2Handler({
  cookieName = 'proxy',
  cookieHttpOnly = true,
  allowPublicAccess = false,
  kvAccountId,
  kvNamespace,
  kvAuthEmail,
  kvAuthKey,
  kvTtl = 2592000, // A month
  oauth2AuthDomain,
  oauth2ClientId,
  oauth2ClientSecret,
  oauth2Audience,
  oauth2Scopes = [],
  oauth2CallbackPath = '/callback',
  oauth2CallbackType = 'cookie',
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
  const callbackType = oauth2CallbackType;
  const serverTokenPath = oauth2ServerTokenPath;
  const serverAuthorizePath = oauth2ServerAuthorizePath;
  const serverLogoutPath = oauth2ServerLogoutPath;
  const clientId = oauth2ClientId;
  const clientSecret = oauth2ClientSecret;
  const audience = oauth2Audience;
  const logoutPath = oauth2LogoutPath;
  const loginPath = oauth2LoginPath;
  const scopes = oauth2Scopes;
  const scope = scopes.join('%20');

  async function getTokenFromCode(code, redirectUrl) {
    const tokenUrl = `${authDomain}${serverTokenPath}`;

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

    const body = await response.json();

    return {
      ...body,
      expires: Date.now() + body.expires_in * 1000,
    };
  }

  async function handleLogout(ctx) {
    const sessionCookie = getCookie({
      cookieHeader: ctx.request.headers.cookie,
      cookieName,
    });

    if (sessionCookie) {
      const domain = ctx.request.hostname.match(/[^.]+\.[^.]+$/i)[0];

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

  async function handleCallback(ctx) {
    const redirectUrl = ctx.request.href.split('?')[0];

    const body = await getTokenFromCode(ctx.request.query.code, redirectUrl);

    const key = shortid.generate();
    const salt = await aes.getSalt();
    const sessionToken = `${key}.${salt}`;

    const aesKey = await aes.deriveAesGcmKey(key, salt);
    const data = await aes.encrypt(aesKey, JSON.stringify(body));

    await kvStorage.put(key, data);

    const domain = ctx.request.hostname.match(/[^.]+\.[^.]+$/i)[0];

    ctx.status = 302;

    if (callbackType === 'query') {
      ctx.set('Location', `${ctx.request.query.state}?auth=${sessionToken}`);
    } else {
      ctx.set(
        'Set-Cookie',
        cookie.serialize(cookieName, sessionToken, {
          httpOnly: cookieHttpOnly,
          domain: `.${domain}`,
          path: '/',
          maxAge: 60 * 60 * 24 * 365, // 1 year
        }),
      );
      ctx.set('Location', ctx.request.query.state);
    }
  }

  /**
   * Try to set a bearer based on the session cookie
   * @param {*} ctx
   * @param {*} sessionToken
   */
  async function getSession(ctx, sessionToken) {
    const [key, salt] = sessionToken.split('.');
    const data = await kvStorage.get(key);

    if (data) {
      const aesKey = await aes.deriveAesGcmKey(key, salt);
      const authData = await aes.decrypt(aesKey, data);

      let tokens = JSON.parse(authData);

      if (tokens.expires < Date.now()) {
        tokens = await jwtRefresh({
          refresh_token: tokens.refresh_token,
          clientId,
          authDomain,
          clientSecret,
        });

        const encryptedAuthData = await aes.encrypt(aesKey, JSON.stringify(tokens));

        await kvStorage.put(key, encryptedAuthData);
      }

      ctx.state.accessToken = tokens.access_token;
      if (ctx.state.accessToken) {
        ctx.request.headers.authorization = `bearer ${ctx.state.accessToken}`;
      }
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
    // TODO: Add a whitelist with regex
    if (referer) {
      return referer;
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
    // Options requests should not be authenticated. Requests with auth headers are passed through
    if (ctx.request.method === 'OPTIONS') {
      await next(ctx);
    } else if (
      _.get(ctx, 'request.headers.authorization', '').toLowerCase().startsWith('bearer ')
    ) {
      // If the request has a auth-header, use this and pass on.
      _.set(ctx, 'state.access_token', ctx.request.headers.authorization.slice(7));
      await next(ctx);
    } else {
      // Check for the token in the querystring first and fallback to the cookie
      const sessionToken =
        _.get(ctx, 'request.query.auth') ||
        getCookie({
          cookieHeader: ctx.request.headers.cookie,
          cookieName,
        });

      // If the client didn't supply a bearer token, try to fetch one based on the cookie
      if (sessionToken) {
        await getSession(ctx, sessionToken);
      }

      const accessToken = _.get(ctx, 'state.accessToken');

      if (accessToken || allowPublicAccess) {
        await next(ctx);
      } else if (isBrowser(ctx.request.headers.accept)) {
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
}
