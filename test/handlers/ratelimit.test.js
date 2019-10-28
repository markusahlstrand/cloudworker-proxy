const { expect } = require('chai');
const rateLimitFactory = require('../../src/handlers/rate-limit');
const helpers = require('../helpers');

describe('ratelimit', () => {
  it('should add ratelimit headers to the response', async () => {
    const rateLimit = rateLimitFactory({});

    const ctx = helpers.getCtx();

    await rateLimit(ctx, helpers.getNext());

    expect(ctx.response.headers.get('X-Ratelimit-Count')).to.equal(1);
    expect(ctx.response.headers.get('X-Ratelimit-Limit')).to.equal(1000);
    expect(ctx.response.headers.get('X-Ratelimit-Count')).to.be.below(60);
  });

  it('should not count options requests', async () => {
    const rateLimit = rateLimitFactory({});

    const ctx = helpers.getCtx();
    ctx.request.method = 'OPTIONS';

    await rateLimit(ctx, helpers.getNext());

    expect(ctx.response.headers.get('X-Ratelimit-Count')).to.equal(0);
    expect(ctx.response.headers.get('X-Ratelimit-Limit')).to.equal(1000);
    expect(ctx.response.headers.get('X-Ratelimit-Count')).to.be.below(60);
  });

  it('should not count head requests', async () => {
    const rateLimit = rateLimitFactory({});

    const ctx = helpers.getCtx();
    ctx.request.method = 'HEAD';

    await rateLimit(ctx, helpers.getNext());

    expect(ctx.response.headers.get('X-Ratelimit-Count')).to.equal(0);
    expect(ctx.response.headers.get('X-Ratelimit-Limit')).to.equal(1000);
    expect(ctx.response.headers.get('X-Ratelimit-Count')).to.be.below(60);
  });

  it('should return a 429 for ratelimited requests', async () => {
    const rateLimit = rateLimitFactory({
      limit: 1,
    });

    const ctx1 = helpers.getCtx();
    const ctx2 = helpers.getCtx();

    await rateLimit(ctx1, helpers.getNext());
    await rateLimit(ctx2, helpers.getNext());

    expect(ctx1.status).to.equal(200);
    expect(ctx2.status).to.equal(429);
  });
});
