import { expect } from 'chai';
import HttpLogger from '../../src/loggers/http';

describe('httpLogger', () => {
  let realFetch, fetchCalls;
  const mockFetch = async (url, options) => {
    fetchCalls.push({
      url,
      options,
    });
  };

  beforeEach(() => {
    realFetch = global.fetch;
    fetchCalls = [];

    global.fetch = mockFetch;
  });

  afterEach(() => {
    global.fetch = realFetch;
  });

  it('should send a message to a http endpoint', async () => {
    const logger = new HttpLogger({
      ctx: {},
      maxSize: 0,
    });

    logger.log({
      foo: 'bar',
    });

    expect(fetchCalls.length).to.equal(1);
  });
});
