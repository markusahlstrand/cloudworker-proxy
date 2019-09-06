const cookie = require('cookie');
const KvStorage = require('../services/kvStorage');

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
    const header = JSON.parse(atob(parts[0]));
    const payload = JSON.parse(atob(parts[1]));
    const signature = atob(parts[2]);

    return {
        header,
        payload,
        signature,
        raw: { header: parts[0], payload: parts[1], signature: parts[2] }
    }
}

async function isValidJwtSignature(token) {
    const encoder = new TextEncoder();
    const data = encoder.encode([token.raw.header, token.raw.payload].join('.'));
    const signature = new Uint8Array(Array.from(token.signature).map(c => c.charCodeAt(0)));
    /*
      const jwk = {
        alg: 'RS256',
        e: 'AQAB',
        ext: true,
        key_ops: ['verify'],
        kty: 'RSA',
        n: RSA_PUBLIC_KEY
      };
    */
    // You need to JWK data with whatever is your public RSA key. If you're using Auth0 you
    // can download it from https://[your_domain].auth0.com/.well-known/jwks.json
    //   const jwk = {
    //     alg: "RS256",
    //     kty: "RSA",
    //     key_ops: ['verify'],
    //     use: "sig",
    //     x5c: [
    //       "MIIDCTCCAfGgAwIBAgIJZB7GbpJrH2wSMA0GCSqGSIb3DQEBCwUAMCIxIDAeBgNVBAMTF2Rpc3ZvbHZpZ28uZXUuYXV0aDAuY29tMB4XDTE5MDQxMDEwNDUwNloXDTMyMTIxNzEwNDUwNlowIjEgMB4GA1UEAxMXZGlzdm9sdmlnby5ldS5hdXRoMC5jb20wggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDJxFEVtDlxvv6D0cjjhi9xz4e0LAj5l4Q2xdKsUHY3z93vmPpusa+OIgiGXsIspf1EApk4Ia4XcK2IkHrGvxrRuOWHpyjCm/jL7jvRCuLS716q8ZAKRnf+EMyiEew1aINmP/r5xjEZbW0PJJXzf2rhwqS2ZxmRSTNsZGi27QAseflUwENtt4m6n6UNOM/lgZXYk+BjYbLNaNpX++hooDlBIYFJsoCoCdkmPIZqob1r3XM6ajGIlt6amhOHewOKsPAcFOLho7BEbh3r4tgk9bpI4CIWOrX/VWESYxA8JZvAwAW1RbTmyNKq/NptrcW+pDioTsMn74R92j9SfU7B2DurAgMBAAGjQjBAMA8GA1UdEwEB/wQFMAMBAf8wHQYDVR0OBBYEFNaMTqrvMBWLOdoSBi28qxOnXmTKMA4GA1UdDwEB/wQEAwIChDANBgkqhkiG9w0BAQsFAAOCAQEAjuMvX06iA0qAm+IqoD4zY12/tUOyQXP71nfZUdLjw101FwyTF4597gnctACpq6C/fyvS52vSglSq/YnjYI7FD63obzmQbVCIErv0d1vGQqyFayKIV4vOedIDJotpkRYMkzc9Jqe/OmIMK5oqhxAGG1dehhnnUBwIN09Eoa2FQ8q1HjkzsdQe9a7hIovPRNpzRFz3/DfY4fQr4zPI+F2eRnyyi7B3/E/tBlR4pRWsxzuETMYZ2TxDyHB9/OC3+PfwrKWhfNXzAO6uuDw8n20vzpU4VEskVsHsvOF80dfRPk7x3uhp2naXh+vhP1d0tQ4Xy+tjvh7e2ocAC2mZQtUPWQ=="
    //     ],
    //     n: "ycRRFbQ5cb7-g9HI44Yvcc-HtCwI-ZeENsXSrFB2N8_d75j6brGvjiIIhl7CLKX9RAKZOCGuF3CtiJB6xr8a0bjlh6cowpv4y-470Qri0u9eqvGQCkZ3_hDMohHsNWiDZj_6-cYxGW1tDySV839q4cKktmcZkUkzbGRotu0ALHn5VMBDbbeJup-lDTjP5YGV2JPgY2GyzWjaV_voaKA5QSGBSbKAqAnZJjyGaqG9a91zOmoxiJbempoTh3sDirDwHBTi4aOwRG4d6-LYJPW6SOAiFjq1_1VhEmMQPCWbwMAFtUW05sjSqvzaba3FvqQ4qE7DJ--Efdo_Un1Owdg7qw",
    //     e: "AQAB",
    //     kid: "MTQ1NEZFRTNENkYxNTlFQUQxQTNGMzc1Mjk3QzRDMDMwNDNGREE5Qw",
    //     x5t: "MTQ1NEZFRTNENkYxNTlFQUQxQTNGMzc1Mjk3QzRDMDMwNDNGREE5Qw"
    //   };
    const response = await fetch('https://disvolvigo.eu.auth0.com/.well-known/jwks.json');
    const body = await response.json();
    const [jwk] = body.keys;

    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    return crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature, data);
}


module.exports = function jwtHandler({ }) {
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

        const authHeader = ctx.request.headers.authorization || '';
        if (authHeader.toLowerCase().startsWith('bearer')) {
            const token = decodeJwt(ctx.request.headers.authorization.slice(7));

            // Is the token expired?
            let expiryDate = new Date(token.payload.exp * 1000)
            let currentDate = new Date(Date.now())
            if (expiryDate <= currentDate) {
                return false
            }

            if (await isValidJwtSignature(token)) {
                ctx.user = token.payload;

                return next(ctx);
            } else {
                ctx.status = 403;
                ctx.body = 'Forbidden';
            }
        }
    }

    return handleValidate;
};
