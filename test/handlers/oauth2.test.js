const { expect } = require('chai');
const fetchMock = require('fetch-mock');
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
        /https:\/\/api\.cloudflare\.com\/client\/v4\/accounts\/kvAccountId\/storage\/kv\/namespaces\/kvNamespace\/values\/.*/,
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
        /https:\/\/api\.cloudflare\.com\/client\/v4\/accounts\/kvAccountId\/storage\/kv\/namespaces\/kvNamespace\/values\/.*/,
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
      expect(ctx.response.headers.get('Location').slice(0, 6)).to.equal('/?auth');
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
        /https:\/\/api\.cloudflare\.com\/client\/v4\/accounts\/kvAccountId\/storage\/kv\/namespaces\/kvNamespace\/values\/.*/,
        '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',
      );

      const ctx = helpers.getCtx();
      ctx.request.path = '/test';
      ctx.request.href = 'http://example.com/test';
      ctx.request.query = {
        auth: '48CqIh02.hMyyX6WII',
      };

      await oauth2Handler(ctx, (ctx) => {
        ctx.status = 200;
        ctx.body = 'Hello world';
      });

      expect(ctx.status).to.equal(200);
    });

    it('should use the auth token from headers', async () => {
      const oauth2Handler = Oauth2Handler({
        oauth2AuthDomain: 'http://example.com',
        oauth2ClientId: '1234',
        oauth2Audience: 'test',
        oauth2CallbackType: 'query',
        kvNamespace: 'kvNamespace',
        kvAccountId: 'kvAccountId',
      });

      const ctx = helpers.getCtx();
      ctx.request.path = '/test';
      ctx.request.href = 'http://example.com/test';
      ctx.request.query = {
        auth: 'should-not-be-used',
      };
      ctx.request.headers.authorization = 'Bearer header-token';

      await oauth2Handler(ctx, (ctx) => {
        ctx.status = 200;
        ctx.body = 'Hello world';
        expect(ctx.request.headers.authorization).to.equal('Bearer header-token');
      });

      expect(ctx.status).to.equal(200);
    });
  });
});
