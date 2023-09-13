// eslint-disable-next-line no-undef
const cache = caches.default;

export async function get(req) {
  const cachedResponse = await cache.match(req);

  return cachedResponse;
}

export async function set(req, res) {
  return cache.put(req.href, res);
}

export default {
  get,
  set,
};
