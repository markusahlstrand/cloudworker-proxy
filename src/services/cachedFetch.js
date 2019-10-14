// eslint-disable-next-line no-undef
const cache = caches.default;

async function cachedFetch(request) {
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  // eslint-disable-next-line no-undef
  const response = await fetch(request);
  if (response.status === 200) {
    await cache.put(request, response);
  }

  return response;
}

module.exports = cachedFetch;
