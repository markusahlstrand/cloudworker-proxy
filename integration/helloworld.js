console.log('Loading');
const Proxy = require('../dist/index.js');
console.log('Proxy', Proxy);
const config = [
  {
    handlerName: 'response',
    options: {
      body: 'Hello world',
    },
  },
];

const proxy = new Proxy(config);

async function fetchAndApply(event) {
  return await proxy.resolve(event);
}

addEventListener('fetch', (event) => {
  event.respondWith(fetchAndApply(event));
});
