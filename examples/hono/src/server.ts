import { Hono } from 'hono';

import packageJson from '../package.json';
import { Env } from './types/Env';
import { registerRoutes } from '../../../src/';
import { basicAuth } from 'hono/basic-auth';
import { cache } from 'hono/cache';
import { originHandler } from '../../../src/handlers';

const app = new Hono<Env>();

app.get('/', async () => {
  return new Response(
    JSON.stringify({
      name: packageJson.name,
      version: packageJson.version,
    }),
  );
});

registerRoutes(app, [
  {
    path: '/test',
    methods: 'GET',
    handler: basicAuth({ username: 'test', password: 'password' }),
  },
  {
    path: '/test',
    methods: 'GET',
    handler: async () => new Response('Raw response'),
  },
  {
    path: '/cache',
    methods: 'GET',
    handler: cache({ cacheName: 'test' }),
  },
  {
    path: '/cache',
    methods: 'GET',
    handler: async () =>
      new Response(`Cachable response at ${new Date().toISOString()}`, {
        headers: {
          'Cache-Control': 'max-age=10',
        },
      }),
  },
  {
    path: '/origin',
    methods: 'GET',
    handler: originHandler({
      baseUrl: 'https://wordpress.com',
      proxyUrl: 'http://localhost:8787',
      skipPath: '/origin',
      rewriteLinks: true,
    }),
  },
  {
    path: '/origin/*',
    methods: 'GET',
    handler: originHandler({
      baseUrl: 'https://wordpress.com',
      proxyUrl: 'http://localhost:8787',
      skipPath: '/origin',
      rewriteLinks: true,
    }),
  },
]);

export default app;
