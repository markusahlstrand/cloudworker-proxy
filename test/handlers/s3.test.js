const { expect } = require('chai');
const s3Factory = require('../../src/handlers/s3');
const helpers = require('../helpers');

const fetchMock = require('fetch-mock');
Object.assign(fetchMock.config, { Headers, Request, Response, fetch });

describe('s3', () => {
  afterEach(() => {
    fetchMock.restore();
  });
  it('GET /doesnoteexist (403)', async () => {
    fetchMock.mock(`https://myBucket.s3.amazonaws.com/doesnoteexist`, {
      status: 403,
    });
    const s3 = s3Factory({
      region: 'eu-central-1',
      bucket: 'myBucket',
      accessKeyId: 'DERP',
      secretAccessKey: 'DERP',
    });

    const ctx = helpers.getCtx();
    ctx.params = {
      file: 'doesnoteexist',
    };
    await s3(ctx, []);
    expect(ctx.status).to.equal(403);
  });
});
