const cookie = require('cookie');
const KvStorage = require('../services/kvStorage');

function getCookie({ cookieHeader = '' , cookieName}) {  
  const cookies = cookie.parse(cookieHeader);
  return cookies[cookieName];
}

/**
 * Very simplistic form serializer that works for this case but probably nothing else :)
 * @param {*} obj 
 */
function serializeFormData(obj) {
  return Object.keys(obj)
    .map(key => `${key}=${encodeURIComponent(obj[key])}`)
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
  kvTtl,
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
    const tokenUrl = `${authDomain}/oauth/token`
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded'
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

    return await response.json();
  }

  async function handleLogout(ctx) {
    const sessionCookie = getCookie({ 
      cookieHeader: ctx.request.headers.cookie,
      cookieName,
    });

    if(sessionCookie) {
      // Remove the cookie
      ctx.set('Set-Cookie', cookie.serialize(cookieName, '', {
        domain: `.${ctx.request.hostname}`,
        maxAge: 0,          
      }));
    }

    const returnTo = encodeURIComponent(`${ctx.request.protocol}://${ctx.request.host}`);    
    ctx.set('Location', `${authDomain}/v2/logout?client_id=${clientId}&returnTo=${returnTo}`);
    ctx.status = 302;
  }

  async function handleCallback(ctx) {
    const body = await getTokenFromCode(ctx.request.query.code, ctx.request.href);
    const accessTokenSegments = body.access_token.split('.');
    const refreshSplitIndex = Math.floor(body.refresh_token.length / 2);

    const key = `${accessTokenSegments.pop()}.${body.refresh_token.slice(refreshSplitIndex)}`;

    const authData = {
      accessToken: `${accessTokenSegments.join('.')}.`,
      refreshToken: body.refresh_token.slice(0, refreshSplitIndex),
      expires: Date.now() + body.expires_in * 1000,
    };

    await kvStorage.put(key, JSON.stringify(authData));

    ctx.status = 302;
    ctx.set('Set-Cookie', cookie.serialize(cookieName, key, {
      domain: `.${ctx.request.hostname}`,
      maxAge: 60 * 60 * 24 * 365, // 1 year            
    }));
    ctx.set('Location', ctx.request.query.state);
  }

  async function getTokenFromRefreshToken(refreshToken) {
    const tokenUrl = `${authDomain}/oauth/token`
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error('Authentication failed');
    }

    return await response.json();
  }

  async function refreshAccessToken(refreshToken) {
    const body = await getTokenFromRefreshToken(refreshToken);

    return body.access_token;
  }

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

    const sessionCookie = getCookie({ 
      cookieHeader: ctx.request.headers.cookie,
      cookieName,
    });

    // If the client didn't supply a bearer token, try to fetch one based on the cookie
    if (!ctx.request.headers.authorization && sessionCookie) {
      const session = await kvStorage.get(sessionCookie);

      if (session) {
        const authData = JSON.parse(session);
        const [accessPart, refreshPart] = sessionCookie.split('.');

        let accessToken = authData.accessToken + accessPart;
        if (session.expires < Date.now()) {
          accessToken = await refreshAccessToken(authData.refreshToken + refreshPart);
        }

        ctx.request.headers.authorization = `bearer ${accessToken}`;
        return next(ctx);
      }
    }

    if (isBrowser(ctx.request.headers.accept)) {
      // For now we just oode the requested url in the state. Could pass more properties in a serialized object
      const state = encodeURIComponent(ctx.request.href);
      const encodedRedirectUri = encodeURIComponent(`${ctx.request.protocol}://${ctx.request.host}${callbackPath}`);

      ctx.status = 302;
      ctx.set('location', `${authDomain}/authorize?state=${state}&client_id=${clientId}&response_type=code&scope=${scope}&audience=${audience}&redirect_uri=${encodedRedirectUri}`);
    } else {
      ctx.status = 403;
      ctx.body = 'Forbidden';
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
