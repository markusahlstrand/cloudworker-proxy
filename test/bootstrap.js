if (typeof btoa === 'undefined') {
  const buffer = require('buffer');
  global.btoa = function (str) {
    return new buffer.Buffer(str, 'binary').toString('base64');
  };
  global.atob = function (b64Encoded) {
    return new buffer.Buffer(b64Encoded, 'base64').toString('binary');
  };
}

if (typeof crypto === 'undefined') {
  global.crypto = require('crypto');
}
