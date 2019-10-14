// eslint-disable-next-line no-undef
const cache = caches.default;

async function cachedFetch(request) {
  const cachedJwk = await cache.match(request);

  if (cachedJwk) {
    return cachedJwk;
  }

  // eslint-disable-next-line no-undef
  const response = await fetch(request);
  if (response.status === 200) {
    await cache.put(jwksUri, response);
  }

  return response;
}

module.exports = cachedFetch;
