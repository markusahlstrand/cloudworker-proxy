const { expect } = require('chai');
const fetchMock = require('fetch-mock');
require('../bootstrap');
const Oauth2Handler = require('../../src/handlers/oauth2');
const helpers = require('../helpers');

describe('oauth2Handler', () => {
  afterEach(() => {
    fetchMock.restore();
  });

  describe('login', () => {
    it('should redirect login requests to the login endpoint', async () => {
      const oauth2Handler = Oauth2Handler({
        oauth2AuthDomain: 'http://example.com',
        oauth2ClientId: '1234',
        oauth2Audience: 'test',
      });

      const ctx = helpers.getCtx();
      ctx.request.path = '/login';

      await oauth2Handler(ctx, helpers.getNext());

      expect(ctx.status).to.equal(302);
      expect(ctx.response.headers.get('location')).to.equal(
        'http://example.com/authorize?state=%2F&client_id=1234&response_type=code&scope=&audience=test&redirect_uri=http%3A%2F%2Fexample.com%2Fcallback',
      );
    });
  });

  describe('callback', () => {
    it('should by default set a cookie and redirect back to the url in the state', async () => {
      const oauth2Handler = Oauth2Handler({
        oauth2AuthDomain: 'http://example.com',
        oauth2ClientId: '1234',
        oauth2Audience: 'test',
        kvNamespace: 'kvNamespace',
        kvAccountId: 'kvAccountId',
      });

      fetchMock.post('http://example.com/oauth/token', {
        access_token: '1234',
        refresh_token: '5678',
        expires_in: 100,
      });
      fetchMock.put(
        'https://api.cloudflare.com/client/v4/accounts/kvAccountId/storage/kv/namespaces/kvNamespace/values/34.56?expiration_ttl=2592000',
        200,
      );

      const ctx = helpers.getCtx();
      ctx.request.path = '/callback';
      ctx.request.href = 'http://example.com/callback';
      ctx.request.query = {
        state: '/',
        code: '1234',
      };

      await oauth2Handler(ctx, helpers.getNext());

      expect(ctx.status).to.equal(302);
      expect(ctx.response.headers.get('Location')).to.equal('/');
      expect(ctx.response.headers.get('Set-Cookie')).to.exist;
    });

    it('should redirect back to the url in the state with an appended auth parameter if configured for querystring tokens', async () => {
      const oauth2Handler = Oauth2Handler({
        oauth2AuthDomain: 'http://example.com',
        oauth2ClientId: '1234',
        oauth2Audience: 'test',
        oauth2CallbackType: 'query',
        kvNamespace: 'kvNamespace',
        kvAccountId: 'kvAccountId',
      });

      fetchMock.post('http://example.com/oauth/token', {
        access_token: '1234',
        refresh_token: '5678',
        expires_in: 100,
      });
      fetchMock.put(
        'https://api.cloudflare.com/client/v4/accounts/kvAccountId/storage/kv/namespaces/kvNamespace/values/34.56?expiration_ttl=2592000',
        200,
      );

      const ctx = helpers.getCtx();
      ctx.request.path = '/callback';
      ctx.request.href = 'http://example.com/callback';
      ctx.request.query = {
        state: '/',
        code: '1234',
      };

      await oauth2Handler(ctx, helpers.getNext());

      expect(ctx.status).to.equal(302);
      expect(ctx.response.headers.get('Location')).to.equal('/?auth=34.56');
    });

    it('should use the auth token from the querystring when validating', async () => {
      const oauth2Handler = Oauth2Handler({
        oauth2AuthDomain: 'http://example.com',
        oauth2ClientId: '1234',
        oauth2Audience: 'test',
        oauth2CallbackType: 'query',
        kvNamespace: 'kvNamespace',
        kvAccountId: 'kvAccountId',
      });

      fetchMock.get(
        'https://api.cloudflare.com/client/v4/accounts/kvAccountId/storage/kv/namespaces/kvNamespace/values/12.34',
        {
          accessToken: '1234',
          refreshToken: '5678',
          expires: Date.now() + 100000,
        },
      );

      const ctx = helpers.getCtx();
      ctx.request.path = '/test';
      ctx.request.href = 'http://example.com/test';
      ctx.request.query = {
        auth: '12.34',
      };

      await oauth2Handler(ctx, (ctx) => {
        ctx.status = 200;
        ctx.bocy = 'Hello world';
      });

      expect(ctx.status).to.equal(200);
    });
  });
});
