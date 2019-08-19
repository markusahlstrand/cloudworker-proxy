/**
 * This the entrypoint for the cloudflare workers
 */

const handler = require('./handler');

async function fetchAndApply(event) {
  try {
    return await handler(event);
  } catch (err) {
    // eslint-disable-next-line no-undef
    return new Response(err.message);
  }
}

// eslint-disable-next-line no-undef,no-restricted-globals
addEventListener('fetch', (event) => {
  event.respondWith(fetchAndApply(event));
});
