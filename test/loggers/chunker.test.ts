import { expect } from 'chai';
import Chunker from '../../src/loggers/chunker';

describe('chunker', () => {
  it('should enque a message', async () => {
    const chunker = new Chunker({
      maxSeconds: 0.01,
      sink: async () => {},
    });

    const timerPromise = chunker.push({
      foo: 'bar',
    });

    expect(chunker.queue.length).to.equal(1);

    await timerPromise;
  });

  it('should process a message once the queue length is higher than the limit', async () => {
    const chunker = new Chunker({
      maxSize: 0,
      sink: () => {},
    });

    chunker.push({
      foo: 'bar',
    });

    expect(chunker.queue.length).to.equal(0);
  });

  it('should concat two messages to a single data chunk', async () => {
    let counter = 0;

    const chunker = new Chunker({
      maxSize: 1,
      sink: () => {
        counter++;
      },
    });

    await Promise.all([
      chunker.push({
        foo: 'bar',
      }),
      chunker.push({
        foo: 'bar',
      }),
    ]);

    expect(chunker.queue.length).to.equal(0);
    expect(counter).to.equal(1);
  });

  it('should send a chunk once the timeout is triggered', async () => {
    let counter = 0;

    const chunker = new Chunker({
      maxSize: 1,
      maxSeconds: 0.001, // The seconds to wait for the chunk to be sent
      sink: async () => {
        counter++;
        return true;
      },
    });

    await chunker.push({
      foo: 'bar',
    });

    expect(chunker.queue.length).to.equal(0);
    expect(counter).to.equal(1);
  });
});
