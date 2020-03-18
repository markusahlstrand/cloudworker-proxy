const aesKeyBitsLength = 256;
const pbkdf2Iterations = 1000;

const PBKDF2 = 'PBKDF2';
const AESGCM = 'AES-GCM';
const SHA256 = 'SHA-256';
const RAW = 'raw';

function base64ToArraybuffer(base64) {
  // eslint-disable-next-line no-undef
  const binary = atob(base64.replace(/_/g, '/').replace(/-/g, '+'));
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function arraybufferTobase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }

  // eslint-disable-next-line no-undef
  return btoa(binary)
    .replace(/\//g, '_')
    .replace(/\+/g, '-');
}

function arraybufferToString(buf) {
  return String.fromCharCode.apply(null, new Uint16Array(buf));
}

function stringToArraybuffer(str) {
  const buf = new ArrayBuffer(str.length * 2); // 2 bytes for each char
  const bufView = new Uint16Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i += 1) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

async function getKeyMaterial(password) {
  const enc = new TextEncoder();
  // eslint-disable-next-line no-undef
  return crypto.subtle.importKey(RAW, enc.encode(password), { name: PBKDF2 }, false, ['deriveKey']);
}

async function deriveAesGcmKey(seed, salt) {
  const key = await getKeyMaterial(seed);
  const textEncoder = new TextEncoder();

  const saltBuffer = textEncoder.encode(salt.replace(/_/g, '/').replace(/-/g, '+'));

  //   eslint-disable-next-line no-undef
  return crypto.subtle.deriveKey(
    {
      name: PBKDF2,
      salt: saltBuffer,
      iterations: pbkdf2Iterations,
      hash: { name: SHA256 },
    },
    key,
    {
      name: AESGCM,
      length: aesKeyBitsLength,
    },
    true,
    ['encrypt', 'decrypt'],
  );
}

async function getSalt() {
  // eslint-disable-next-line no-undef
  const salt = crypto.getRandomValues(new Uint8Array(8));
  return arraybufferTobase64(salt);
}

async function decrypt(key, message) {
  const bytes = base64ToArraybuffer(message);
  const iv = bytes.slice(0, 16);
  const data = bytes.slice(16);

  // eslint-disable-next-line no-undef
  const array = await crypto.subtle.decrypt(
    {
      name: AESGCM,
      iv,
    },
    key,
    data,
  );

  return arraybufferToString(array);
}

async function encrypt(key, message) {
  // eslint-disable-next-line no-undef
  const iv = crypto.getRandomValues(new Uint8Array(16));

  // eslint-disable-next-line no-undef
  const encrypted = await crypto.subtle.encrypt(
    {
      name: AESGCM,
      iv,
    },
    key,
    stringToArraybuffer(message),
  );

  const bytes = new Uint8Array(encrypted.byteLength + iv.byteLength);
  bytes.set(iv, 0);
  bytes.set(new Uint8Array(encrypted), iv.byteLength);

  return arraybufferTobase64(bytes);
}

module.exports = {
  decrypt,
  deriveAesGcmKey,
  encrypt,
  getSalt,
};
