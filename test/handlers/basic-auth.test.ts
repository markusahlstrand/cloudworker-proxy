import { expect } from 'chai';
import basicAuthFactory from '../../src/handlers/basic-auth';
import helpers from '../helpers';

describe('basicAuth', () => {
  it('should return a 401 if the basic auth headers are not available', async () => {
    const handler = basicAuthFactory({
      users: [],
    });

    const ctx = helpers.getCtx();
    ctx.request.path = '/test';
    await handler(ctx, []);

    expect(ctx.status).to.equal(401);
  });
});
