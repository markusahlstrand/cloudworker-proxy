// Basic integration test, check we can deploy our binary to cloudflare and
// serve traffic
// Bun will not work with wrangler until https://github.com/oven-sh/bun/issues/808
// So this script has to run with node.js.
// Thus we don;t have bun's testing librarys so for now we will use an exit code
// the indicate failure
const wrangler = require('wrangler');

const fail = (reason) => {
  console.error(reason);
  process.exit(1);
};

async function test() {
  const worker = await wrangler.unstable_dev('integration/helloworld.js', {});

  const res = await worker.fetch('');
  const response = await res.text();
  worker.stop();

  if (res.status !== 200) {
    fail(`Unexpected status ${res.status}`);
  }
  if (response !== 'Hello world') {
    fail(`Unexpected response ${response}`);
  }

  console.log('Tests pass');
}

test();
