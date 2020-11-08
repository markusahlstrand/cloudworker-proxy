const { expect } = require('chai');
const apiKeysFactory = require('../../src/handlers/api-keys');
const helpers = require('../helpers');
const fetchMock = require('fetch-mock');

function mockCall(key, returns = 'OK') {
  fetchMock.mock(
    `https://api.cloudflare.com/client/v4/accounts/accountId/storage/kv/namespaces/namespace/values/${key}`,
    returns,
  );
}

const kvConfig = {
  kvAccountId: 'accountId',
  kvNamespace: 'namespace',
  kvAuthEmail: 'authEmail',
  kvAuthKey: 'authKey',
};

describe('apiKeys', () => {
  afterEach(() => {
    fetchMock.restore();
  });

  describe('validate', () => {
    it('should write the value of the api key to the state of the context', async () => {
      const handler = apiKeysFactory({
        ...kvConfig,
      });

      mockCall('asdf', { value: 'value' });

      const ctx = helpers.getCtx();
      ctx.request.headers['x-api-key'] = 'asdf';

      await handler(ctx, helpers.getNext());

      expect(ctx.state.user.value).to.equal('value');
    });

    it('should return a 403 for request with an invalid api-key', async () => {
      const handler = apiKeysFactory({
        ...kvConfig,
      });

      const ctx = helpers.getCtx();
      ctx.request.headers['x-api-key'] = 'asdf';
      mockCall('asdf', 404);

      await handler(ctx, helpers.getNext());

      expect(ctx.status).to.equal(403);
    });
  });

  describe('create', () => {
    it('should return a 403 for request without a user', async () => {
      const handler = apiKeysFactory({
        ...kvConfig,
      });

      const ctx = helpers.getCtx();
      ctx.request.path = '/api-keys';
      ctx.request.method = 'POST';

      await handler(ctx, helpers.getNext());

      expect(ctx.status).to.equal(403);
    });
  });
});
