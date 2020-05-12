const nodeCrypto = require('crypto');
const { expect } = require('chai');

function str2ab(str) {
  const uintArray = new Uint8Array(
    str.split('').map((char) => {
      return char.charCodeAt(0);
    }),
  );
  return uintArray;
}

describe('hmac', () => {
  it('should get the same signature in node as in js', async () => {
    // Generate the SHA-256 hash from the secret string
    let key = await crypto.subtle.importKey(
      'raw',
      str2ab('secret'),
      { name: 'HMAC', hash: { name: 'SHA-256' } },
      false,
      ['sign', 'verify'],
    );

    // Sign the "str" with the key generated previously
    let sig = await crypto.subtle.sign({ name: 'HMAC' }, key, str2ab('message'));
    const jsSignature = btoa(String.fromCharCode.apply(null, new Uint8Array(sig)));

    const nodeSignature = nodeCrypto
      .createHmac('SHA256', 'secret')
      .update('message')
      .digest('base64');

    expect(nodeSignature).to.equal(jsSignature);
  });
});
