import CorsHandler from '../../src/handlers/cors';
import helpers from '../helpers';

describe('corsHandler', () => {
  it('should not return Access-Control-Allow-Origin if the origin is not in the allowed headers list', async () => {
    const corsHandler = CorsHandler({
      allowedOrigins: [],
    });

    const ctx = helpers.getCtx();

    await corsHandler(ctx, helpers.getNext());

    expect(ctx.response.headers.get('Access-Control-Allow-Origin')).toBe(undefined);
  });
  it('should return Access-Control-Allow-Origin "*", if allowedOrigin = ["*"]', async () => {
    const corsHandler = CorsHandler({
      allowedOrigins: ['*'],
    });
    const ctx = helpers.getCtx();
    await corsHandler(ctx, helpers.getNext());
    expect(ctx.response.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
  it('should return Access-Control-Allow-Origin, if Origin is in allowedOrigin array', async () => {
    const corsHandler = CorsHandler({
      allowedOrigins: ['somehost', 'localhost'],
    });
    const ctx = helpers.getCtx();
    await corsHandler(ctx, helpers.getNext());
    expect(ctx.response.headers.get('Access-Control-Allow-Origin')).toBe('localhost');
  });
  it('should return Access-Control-Expose-Headers that was configured', async () => {
    const corsHandler = CorsHandler({
      allowedExposeHeaders: ['Header1', 'Header2'],
    });
    const ctx = helpers.getCtx();
    await corsHandler(ctx, helpers.getNext());
    expect(ctx.response.headers.get('Access-Control-Expose-Headers')).toBe('Header1,Header2');
  });
  it('should return Access-Control-Allow-Credentials by default', async () => {
    const corsHandler = CorsHandler({});
    const ctx = helpers.getCtx();
    await corsHandler(ctx, helpers.getNext());
    expect(ctx.response.headers.get('Access-Control-Allow-Credentials')).toBe(true);
  });
  it('should not return Access-Control-Allow-Credentials if it was set to false', async () => {
    const corsHandler = CorsHandler({
      allowCredentials: false,
    });
    const ctx = helpers.getCtx();
    await corsHandler(ctx, helpers.getNext());
    expect(ctx.response.headers.get('Access-Control-Allow-Credentials')).toBe(undefined);
  });
  it('should not return Access-Control-Allow-Methods if method is not options', async () => {
    const corsHandler = CorsHandler({});
    const ctx = helpers.getCtx();
    await corsHandler(ctx, helpers.getNext());
    expect(ctx.response.headers.get('Access-Control-Allow-Methods')).toBe(undefined);
  });
  it('should return Access-Control-Allow-Methods if method is OPTIONS', async () => {
    const corsHandler = CorsHandler({});
    const ctx = helpers.getCtx();
    ctx.request.method = 'OPTIONS';
    await corsHandler(ctx, helpers.getNext());
    expect(ctx.response.headers.get('Access-Control-Allow-Methods')).toBeDefined();
  });
  it('should return Access-Control-Allow-Methods with the methods that were configured', async () => {
    const corsHandler = CorsHandler({
      allowedMethods: ['POST', 'GET'],
    });
    const ctx = helpers.getCtx();
    ctx.request.method = 'OPTIONS';
    await corsHandler(ctx, helpers.getNext());
    expect(ctx.response.headers.get('Access-Control-Allow-Methods')).toBe('POST,GET');
  });
  it('should not return Access-Control-Allow-Headers if method is not options', async () => {
    const corsHandler = CorsHandler({});
    const ctx = helpers.getCtx();
    await corsHandler(ctx, helpers.getNext());
    expect(ctx.response.headers.get('Access-Control-Allow-Headers')).toBe(undefined);
  });
  it('should return Access-Control-Allow-Headers if method is OPTIONS', async () => {
    const corsHandler = CorsHandler({});
    const ctx = helpers.getCtx();
    ctx.request.method = 'OPTIONS';
    await corsHandler(ctx, helpers.getNext());
    expect(ctx.response.headers.get('Access-Control-Allow-Headers')).toBeDefined();
  });
  it("should return Access-Control-Allow-Headers with the request's requested headers if allowedHeaders is set to []", async () => {
    const corsHandler = CorsHandler({
      allowedHeaders: [],
    });
    const ctx = helpers.getCtx();
    ctx.request.method = 'OPTIONS';
    ctx.request.headers['access-control-request-headers'] = 'Header1,Header2';
    await corsHandler(ctx, helpers.getNext());
    expect(ctx.response.headers.get('Access-Control-Allow-Headers')).toBe('Header1,Header2');
  });
  it('should return Access-Control-Allow-Headers with the allowedHeaders', async () => {
    const corsHandler = CorsHandler({
      allowedHeaders: ['Header1', 'Header2'],
    });
    const ctx = helpers.getCtx();
    ctx.request.method = 'OPTIONS';
    await corsHandler(ctx, helpers.getNext());
    expect(ctx.response.headers.get('Access-Control-Allow-Headers')).toBe('Header1,Header2');
  });
  it('should not return Access-Control-Max-Age if method is not OPTIONS', async () => {
    const corsHandler = CorsHandler({});
    const ctx = helpers.getCtx();
    await corsHandler(ctx, helpers.getNext());
    expect(ctx.response.headers.get('Access-Control-Max-Age')).toBe(undefined);
  });
  it('should return Access-Control-Max-Age if method is OPTIONS', async () => {
    const corsHandler = CorsHandler({});
    const ctx = helpers.getCtx();
    ctx.request.method = 'OPTIONS';
    await corsHandler(ctx, helpers.getNext());
    expect(ctx.response.headers.get('Access-Control-Max-Age')).toBeDefined();
  });
  it('should return Access-Control-Max-Age with the configured maxAge', async () => {
    const corsHandler = CorsHandler({
      maxAge: 1200,
    });
    const ctx = helpers.getCtx();
    ctx.request.method = 'OPTIONS';
    await corsHandler(ctx, helpers.getNext());
    expect(ctx.response.headers.get('Access-Control-Max-Age')).toBe(1200);
  });
  it('should return no body if method is OPTIONS and terminatePreflight is set', async () => {
    const corsHandler = CorsHandler({
      terminatePreflight: true,
    });
    const ctx = helpers.getCtx();
    ctx.request.method = 'OPTIONS';
    await corsHandler(ctx, helpers.getNext());
    expect(ctx.response.body).toBe(undefined);
  });
  it('should return no Content-Length:0 header if method is OPTIONS and terminatePreflight is set', async () => {
    const corsHandler = CorsHandler({
      terminatePreflight: true,
    });
    const ctx = helpers.getCtx();
    ctx.request.method = 'OPTIONS';
    await corsHandler(ctx, helpers.getNext());
    expect(ctx.response.headers.get('Content-Length')).toBe('0');
  });
  it('should return response 204 if method is OPTIONS and terminatePreflight is set', async () => {
    const corsHandler = CorsHandler({
      terminatePreflight: true,
    });
    const ctx = helpers.getCtx();
    ctx.request.method = 'OPTIONS';
    await corsHandler(ctx, helpers.getNext());
    expect(ctx.status).toBe(204);
  });
  it('should return response defined in optionsSuccessStatus if method is OPTIONS and terminatePreflight is set', async () => {
    const corsHandler = CorsHandler({
      terminatePreflight: true,
      optionsSuccessStatus: 200,
    });
    const ctx = helpers.getCtx();
    ctx.request.method = 'OPTIONS';
    await corsHandler(ctx, helpers.getNext());
    expect(ctx.status).toBe(200);
  });
});
