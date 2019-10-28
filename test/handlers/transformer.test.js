const { expect } = require('chai');
const transformFactory = require('../../src/handlers/transform');
const helpers = require('../helpers');

describe('transform', () => {
  it('should do a simple text replace', async () => {
    const regexHandler = transformFactory({
      transforms: [
        {
          regex: 'foo',
          replace: 'bar',
        },
      ],
    });

    const ctx = helpers.getCtx();

    ctx.status = 200;
    ctx.body = 'foo';

    await regexHandler(ctx, () => {});

    expect(ctx.body).to.equal('bar');
    expect(ctx.status).to.equal(200);
  });

  it('should add text after the body tag', async () => {
    const transformHandler = transformFactory({
      transforms: [
        {
          regex: '<body>',
          replace: '{{$0}}Hello',
        },
      ],
    });

    const ctx = helpers.getCtx();

    ctx.status = 200;
    ctx.body = '<html><body></body></html>';

    await transformHandler(ctx, () => {});

    expect(ctx.body).to.equal('<html><body>Hello</body></html>');
    expect(ctx.status).to.equal(200);
  });

  it('should only transform on 200 status codes', async () => {
    const transformHandler = transformFactory({
      transforms: [
        {
          regex: 'foo',
          replace: 'bar',
        },
      ],
    });

    const ctx = helpers.getCtx();

    ctx.status = 404;
    ctx.body = 'foo';

    await transformHandler(ctx, () => {});

    expect(ctx.body).to.equal('foo');
  });
});
