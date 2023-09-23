import { Hono } from 'hono';

import packageJson from '../package.json';
import Proxy from '../../src/index';
import { rules } from './rules';
import handlers from '../../src/handlers';

const app = new Hono();

const proxy = new Proxy(rules, handlers);

app.get('/', async () => {
  return new Response(
    JSON.stringify({
      name: packageJson.name,
      version: packageJson.version,
    }),
  );
});

app.all('/*', async (ctx) => {
  return proxy.resolve(ctx.req as Request);
});

export default app;
