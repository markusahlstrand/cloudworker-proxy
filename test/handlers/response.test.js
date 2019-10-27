const { expect } = require('chai');
const responseFactory = require('../../src/handlers/response');
const helpers = require('../helpers');

describe('response', () => {
  it('should return a static response', async () => {
    const responseHandler = responseFactory({
      status: 200,
      body: 'Test',
      headers: {
        foo: 'bar',
      },
    });

    const ctx = helpers.getCtx();

    await responseHandler(ctx, []);

    expect(ctx.body).to.equal('Test');
    expect(ctx.status).to.equal(200);
    expect(ctx.response.headers.get('foo')).to.equal('bar');
  });
});
