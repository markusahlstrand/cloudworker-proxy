const { expect } = require('chai');
const CorsHandler = require('../../src/handlers/cors');
const helpers = require('../helpers');

describe('corsHandler', () => {
  it('should not add any cors header if the origin is not in the allowed headers list', async () => {
    const corsHandler = CorsHandler({
      allowedOrigins: [],
    });

    const ctx = helpers.getCtx();

    await corsHandler(ctx, helpers.getNext());

    expect(ctx.response.headers.size).to.equal(0);
  });

  it('should add cors header if the origin is in the allowed headers list', async () => {
    const corsHandler = CorsHandler({
      allowedOrigins: ['http://localhost'],
    });

    const ctx = helpers.getCtx();

    await corsHandler(ctx, helpers.getNext());

    expect(ctx.response.headers.size).to.not.equal(0);
  });

  it('should add cors header if the allowed headers list is not specified', async () => {
    const corsHandler = CorsHandler({});

    const ctx = helpers.getCtx();

    await corsHandler(ctx, helpers.getNext());

    expect(ctx.response.headers.size).to.not.equal(0);
  });
});
