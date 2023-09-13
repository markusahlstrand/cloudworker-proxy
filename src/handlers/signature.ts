let keyCache;

function str2ab(str) {
  const uintArray = new Uint8Array(
    str.split('').map((char) => {
      return char.charCodeAt(0);
    }),
  );
  return uintArray;
}

async function getKey(secret) {
  if (!keyCache) {
    keyCache = await crypto.subtle.importKey(
      'raw',
      str2ab(secret),
      { name: 'HMAC', hash: { name: 'SHA-256' } },
      false,
      ['sign', 'verify'],
    );
  }
  return keyCache;
}

async function sign(path, secret) {
  const key = await getKey(secret);

  const sig = await crypto.subtle.sign({ name: 'HMAC' }, key, str2ab(path));
  return btoa(String.fromCharCode.apply(null, new Uint8Array(sig)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export default function signatureHandler({ secret }) {
  return async (ctx, next) => {
    const pathWithQuery = (ctx.request.path + ctx.request.search).replace(
      /([?|&]sign=[\w|-]+)/,
      '',
    );

    const signature = await sign(pathWithQuery, secret);

    if (signature !== ctx.query.sign) {
      ctx.status = 403;
      return;
    }

    await next(ctx);
  };
}
