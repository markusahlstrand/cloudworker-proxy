import { expect } from 'chai';
import s3Factory from '../../src/handlers/s3';
import helpers from '../helpers';

import fetchMock from 'fetch-mock';
Object.assign(fetchMock.config, { Headers, Request, Response, fetch });

describe('s3', () => {
  afterEach(() => {
    fetchMock.restore();
  });
  it('GET /doesnoteexist (403)', async () => {
    fetchMock.mock(`https://mybucket.s3.amazonaws.com/doesnoteexist`, {
      status: 403,
    });
    const s3 = s3Factory({
      bucket: 'myBucket',
      accessKeyId: 'DERP',
      secretAccessKey: 'DERP',
    });

    const ctx = helpers.getCtx();
    ctx.params = {
      file: 'doesnoteexist',
    };
    await s3(ctx);
    expect(ctx.status).to.equal(403);
  });

  it('Custom endpoint with forcePathStyle', async () => {
    fetchMock.mock(`http://localhost:9000/myBucket/doesnoteexist`, {
      status: 200,
    });
    const s3 = s3Factory({
      endpoint: 'http://localhost:9000',
      forcePathStyle: true,
      bucket: 'myBucket',
      accessKeyId: 'DERP',
      secretAccessKey: 'DERP',
    });

    const ctx = helpers.getCtx();
    ctx.params = {
      file: 'doesnoteexist',
    };
    await s3(ctx);
    expect(ctx.status).to.equal(200);
  });

  it('List bucket without enableBucketOperations should 404', async () => {
    const s3 = s3Factory({
      endpoint: 'http://localhost:9000',
      forcePathStyle: true,
      bucket: 'myBucket',
      accessKeyId: 'DERP',
      secretAccessKey: 'DERP',
    });

    const ctx = helpers.getCtx();
    ctx.params = {};
    await s3(ctx);
    expect(ctx.status).to.equal(404);
  });

  it('List bucket with enableBucketOperations should forward to bucket URL', async () => {
    fetchMock.mock(`http://localhost:9000/myBucket`, {
      status: 200,
    });

    const s3 = s3Factory({
      endpoint: 'http://localhost:9000',
      forcePathStyle: true,
      bucket: 'myBucket',
      accessKeyId: 'DERP',
      secretAccessKey: 'DERP',
      enableBucketOperations: true,
    });

    const ctx = helpers.getCtx();
    ctx.params = {};
    await s3(ctx);
    expect(ctx.status).to.equal(200);
  });
});
