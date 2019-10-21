// eslint-disable-next-line no-undef
const cache = caches.default;

async function cachedFetch(url, options = {}) {
  // eslint-disable-next-line no-undef
  if (!options.cached) {
    return fetch(url, options);
  }

  const cachedResponse = await cache.match(url);

  if (cachedResponse) {
    return cachedResponse;
  }

  // eslint-disable-next-line no-undef
  const response = await fetch(url, options);
  if (response.status === 200) {
    await cache.put(url, response);
  }

  return response;
}

module.exports = cachedFetch;
