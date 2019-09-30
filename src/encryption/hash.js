module.exports = async function hash(data) {
  const encodedData = new TextEncoder().encode(data);

  // eslint-disable-next-line no-undef
  const hashBuffer = await crypto.subtle.digest('SHA-256', encodedData);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};
