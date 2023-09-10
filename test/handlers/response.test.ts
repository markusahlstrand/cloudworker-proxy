import { expect } from 'chai';
import responseFactory from '../../src/handlers/response';
import helpers from '../helpers';

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

  it('should return a json body + headers if the body is an object', async () => {
    const responseHandler = responseFactory({
      status: 200,
      body: {
        foo: 'bar',
      },
      headers: {
        foo: 'bar',
      },
    });

    const ctx = helpers.getCtx();

    await responseHandler(ctx, []);

    expect(ctx.body).to.equal('{"foo":"bar"}');
    expect(ctx.status).to.equal(200);
    expect(ctx.response.headers.get('foo')).to.equal('bar');
    expect(ctx.response.headers.get('Content-Type')).to.equal('application/json');
  });
});
