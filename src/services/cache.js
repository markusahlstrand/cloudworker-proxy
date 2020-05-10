// eslint-disable-next-line no-undef
const cache = caches.default;

async function get(req) {
  const cachedResponse = await cache.match(req);

  return cachedResponse;
}

async function set(req, res) {
  // eslint-disable-next-line no-undef
  return await cache.put(req.href, res);
}

module.exports = {
  get,
  set,
};
