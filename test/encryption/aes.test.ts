import { expect } from 'chai';

import aes from '../../src/encryption/aes';

describe('aes', () => {
  it('should encrypt and decrypt back using a pbkfs2 key', async () => {
    const seed = 'seed';

    const salt = await aes.getSalt();

    const encodeKey = await aes.deriveAesGcmKey(seed, salt);
    const decodeKey = await aes.deriveAesGcmKey(seed, salt);

    const message = 'message';
    const encrypted = await aes.encrypt(encodeKey, message);
    const decrypted = await aes.decrypt(decodeKey, encrypted);

    expect(decrypted).to.equal(message);
  });
});
