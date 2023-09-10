import nodeCrypto from 'crypto';
import { expect } from 'chai';

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

  it('should get the same signature in node as in js with querystrings', async () => {
    const message =
      '/ae5ac453-f76e-4f95-a9d9-ecd865844990/episodes/9e077591-8874-4a1e-8a24-dc012603dae6/kapitel1.mp3?showUrl=skarmhjarnan&public=true&episodeId=9e077591-8874-4a1e-8a24-dc012603dae6';
    const secret = '694de11d-2883-4b39-a833-4265a48d276a';

    // Generate the SHA-256 hash from the secret string
    let key = await crypto.subtle.importKey(
      'raw',
      str2ab(secret),
      { name: 'HMAC', hash: { name: 'SHA-256' } },
      false,
      ['sign', 'verify'],
    );

    // Sign the "str" with the key generated previously
    let sig = await crypto.subtle.sign({ name: 'HMAC' }, key, str2ab(message));
    const jsSignature = btoa(String.fromCharCode.apply(null, new Uint8Array(sig)));

    const nodeSignature = nodeCrypto.createHmac('SHA256', secret).update(message).digest('base64');

    expect(nodeSignature).to.equal(jsSignature);
    console.log('SIg: ' + nodeSignature);
  });
});
