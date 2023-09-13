import { expect } from 'chai';
import loadbalancerFactory from '../../src/handlers/loadbalancer';
import helpers from '../helpers';

describe('loadbalancer', () => {
  let fetch;
  let fetchedUrl;

  beforeEach(() => {
    fetch = global.fetch;
    global.fetch = async (url, options) => {
      fetchedUrl = url;

      return new Response('test', {
        status: 200,
      });
    };
  });

  afterEach(() => {
    global.fetch = fetch;
    delete global.fetch;
    delete global.caches;
  });

  it('should make a request to source', async () => {
    const handler = loadbalancerFactory({
      sources: [
        {
          url: 'https://example.com/{file}',
        },
      ],
    });

    const ctx = helpers.getCtx();
    ctx.params = {
      file: 'test',
    };
    ctx.request.search = '?foo=bar';

    await handler(ctx, []);

    expect(fetchedUrl).to.equal('https://example.com/test?foo=bar');
  });
});
