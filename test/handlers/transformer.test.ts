import { expect } from 'chai';
import transformFactory from '../../src/handlers/transform';
import helpers from '../helpers';

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

  it('should replace multiple instances', async () => {
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
    ctx.body = 'foo-foo';

    await regexHandler(ctx, () => {});

    expect(ctx.body).to.equal('bar-bar');
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
