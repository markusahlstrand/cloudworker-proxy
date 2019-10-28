const cookie = require('cookie');
const KvStorage = require('../services/kvStorage');
const jwtRefresh = require('./jwt-refresh');

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
  kvAccountId,
  kvNamespace,
  kvAuthEmail,
  kvAuthKey,
  kvTtl = 2592000, // A month
  oauth2AuthDomain,
  oauthClientId,
  oauth2ClientSecret,
  oauth2Audience,
  oauth2CallbackPath = '/callback',
  oauth2LogoutPath = '/logout',
  oauth2Scopes,
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
  const clientId = oauthClientId;
  const clientSecret = oauth2ClientSecret;
  const audience = oauth2Audience;
  const logoutPath = oauth2LogoutPath;
  const scopes = oauth2Scopes;
  const scope = scopes.join('%20');

  async function getTokenFromCode(code, redirectUrl) {
    const tokenUrl = `${authDomain}/oauth/token`;

    // eslint-disable-next-line no-undef
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: serializeFormData({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code,
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
          maxAge: 0,
        }),
      );
    }

    const returnTo = encodeURIComponent(`${ctx.request.protocol}://${ctx.request.host}`);
    ctx.set('Location', `${authDomain}/v2/logout?client_id=${clientId}&returnTo=${returnTo}`);
    ctx.status = 302;
  }

  function splitAuthData(authData) {
    const accessTokenSegments = authData.accessToken.split('.');
    const refreshSplitIndex = Math.floor(authData.refreshToken.length / 2);

    const key = `${accessTokenSegments.pop()}.${authData.refreshToken.slice(refreshSplitIndex)}`;

    return {
      serverAuthData: {
        accessToken: `${accessTokenSegments.join('.')}.`,
        refreshToken: authData.refreshToken.slice(0, refreshSplitIndex),
        expires: authData.expires,
      },
      key,
    };
  }

  async function handleCallback(ctx) {
    const body = await getTokenFromCode(ctx.request.query.code, ctx.request.href);

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
        maxAge: 60 * 60 * 24 * 365, // 1 year
      }),
    );
    ctx.set('Location', ctx.request.query.state);
  }

  /**
   * Validates the request based on bearer token and cookie
   * @param {*} ctx
   * @param {*} next
   */
  async function handleValidate(ctx, next) {
    // Options requests should not be authenticated. Requests with auth headers are passed through
    if (ctx.request.method === 'OPTIONS' || ctx.request.headers.authorization) {
      await next(ctx);
    } else {
      const sessionCookie = getCookie({
        cookieHeader: ctx.request.headers.cookie,
        cookieName,
      });

      // If the client didn't supply a bearer token, try to fetch one based on the cookie
      if (!ctx.request.headers.authorization && sessionCookie) {
        const session = await kvStorage.get(sessionCookie);

        if (session) {
          try {
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
            await next(ctx);
          } catch (err) {
            // eslint-disable-next-line no-console
            console.log(`Failed to fetch the session: ${err.message}`);
          }
        } else {
          // Remove the cookie if the session can't be found in the kv-store
          const domain = ctx.request.hostname.match(/[^.]+\.[^.]+$/i)[0];

          if (sessionCookie) {
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
      }

      if (isBrowser(ctx.request.headers.accept)) {
        // For now we just oode the requested url in the state. Could pass more properties in a serialized object
        const state = encodeURIComponent(ctx.request.href);
        const encodedRedirectUri = encodeURIComponent(
          `${ctx.request.protocol}://${ctx.request.host}${callbackPath}`,
        );

        ctx.status = 302;
        ctx.set(
          'location',
          `${authDomain}/authorize?state=${state}&client_id=${clientId}&response_type=code&scope=${scope}&audience=${audience}&redirect_uri=${encodedRedirectUri}`,
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
      default:
        await handleValidate(ctx, next);
    }
  };
};
