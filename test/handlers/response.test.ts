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

    expect(ctx.body).toBe('Test');
    expect(ctx.status).toBe(200);
    expect(ctx.response.headers.get('foo')).toBe('bar');
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

    expect(ctx.body).toBe('{"foo":"bar"}');
    expect(ctx.status).toBe(200);
    expect(ctx.response.headers.get('foo')).toBe('bar');
    expect(ctx.response.headers.get('Content-Type')).toBe('application/json');
  });
});
