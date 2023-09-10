import { expect } from 'chai';
import kvStorageFactory from '../../src/handlers/kv-storage';
import helpers from '../helpers';
import fetchMock from 'fetch-mock';

function mockCall(key) {
  fetchMock.mock(
    `https://api.cloudflare.com/client/v4/accounts/accountId/storage/kv/namespaces/namespace/values/${key}`,
    'OK',
  );
}

describe('kvStorage', () => {
  let handler;

  beforeEach(() => {
    handler = kvStorageFactory({
      kvAccountId: 'accountId',
      kvNamespace: 'namespace',
      kvAuthEmail: 'authEmail',
      kvAuthKey: 'authKey',
    });
  });

  afterEach(() => {
    fetchMock.restore();
  });

  it('should fetch a file from kv', async () => {
    mockCall('index.html');

    const ctx = helpers.getCtx();
    ctx.request.path = '/index.html';
    ctx.params = {
      file: 'index.html',
    };
    await handler(ctx, []);

    expect(ctx.status).to.equal(200);
  });

  it('should return a 404 if a file is not found', async () => {
    const ctx = helpers.getCtx();
    ctx.request.path = '/index.html';
    ctx.params = {
      file: 'index.html',
    };
    await handler(ctx, []);

    expect(ctx.status).to.equal(404);
  });

  it('apply a default file type to a file fetched for kv', async () => {
    mockCall('index.html');

    const ctx = helpers.getCtx();
    ctx.request.path = '/index';
    ctx.params = {
      file: 'index',
    };
    await handler(ctx, []);

    expect(ctx.status).to.equal(200);
  });

  it('apply a default file type to a file in a nested folder', async () => {
    mockCall('nested/folder/index.html');

    const ctx = helpers.getCtx();
    ctx.request.path = '/nested/folder/index';
    ctx.params = {
      file: 'nested/folder/index',
    };
    await handler(ctx, []);

    expect(ctx.status).to.equal(200);
  });
});
