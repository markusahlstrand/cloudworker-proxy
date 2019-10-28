const cachedFetch = require('../services/cachedFetch');

/**
 * Parse and decode a JWT.
 * A JWT is three, base64 encoded, strings concatenated with ‘.’:
 *   a header, a payload, and the signature.
 * The signature is “URL safe”, in that ‘/+’ characters have been replaced by ‘_-’
 *
 * Steps:
 * 1. Split the token at the ‘.’ character
 * 2. Base64 decode the individual parts
 * 3. Retain the raw Bas64 encoded strings to verify the signature
 */
function decodeJwt(token) {
  const parts = token.split('.');
  // eslint-disable-next-line no-undef
  const header = JSON.parse(atob(parts[0]));
  // eslint-disable-next-line no-undef
  const payload = JSON.parse(atob(parts[1]));
  // eslint-disable-next-line no-undef
  const signature = atob(parts[2].replace(/-/g, '+').replace(/_/g, '/'));

  return {
    header,
    payload,
    signature,
    raw: { header: parts[0], payload: parts[1], signature: parts[2] },
  };
}

module.exports = function jwtHandler({ jwksUri }) {
  async function getJwk() {
    // TODO: override jwksTtl..
    const response = await cachedFetch(jwksUri);

    const body = await response.json();
    const [jwk] = body.keys;

    return jwk;
  }

  async function isValidJwtSignature(token) {
    const encoder = new TextEncoder();
    const data = encoder.encode([token.raw.header, token.raw.payload].join('.'));
    const signature = new Uint8Array(Array.from(token.signature).map((c) => c.charCodeAt(0)));

    const jwk = await getJwk();
    // eslint-disable-next-line no-undef
    const key = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    );

    // eslint-disable-next-line no-undef
    return crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature, data);
  }

  /**
   * Validates the request based on bearer token and cookie
   * @param {*} ctx
   * @param {*} next
   */
  async function handleValidate(ctx, next) {
    // Options requests should not be authenticated
    if (ctx.request.method === 'OPTIONS') {
      return next(ctx);
    }

    const authHeader = ctx.request.headers.authorization || '';
    if (authHeader.toLowerCase().startsWith('bearer')) {
      const token = decodeJwt(ctx.request.headers.authorization.slice(7));

      // Is the token expired?
      const expiryDate = new Date(token.payload.exp * 1000);
      const currentDate = new Date(Date.now());
      if (expiryDate <= currentDate) {
        return false;
      }

      if (await isValidJwtSignature(token)) {
        ctx.user = token.payload;

        return next(ctx);
      }

      ctx.status = 403;
      ctx.body = 'Forbidden';
    }

    return ctx;
  }

  return handleValidate;
};
