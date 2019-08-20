/**
 * Concatinates messages in chunks based on count and timeout
 */
module.exports = class chunker {
  constructor({ maxSize = 10, maxSeconds = 10, sink }) {
    this.maxSize = maxSize;
    this.maxSeconds = maxSeconds;
    this.queue = []; // The queue of messages to process
    this.sink = sink; // The function to call with a complete chunk
    this.flushing = false; // A state flag to avoid multiple simultaneous flushes
    this.timer = null; // A promise to pass to ctx.waitUntil
  }

  async push(message) {
    this.queue.push(message);

    if (this.queue.length > this.maxSize) {
      return this.flush();
    }

    if (!this.timer) {
      this.timer = new Promise((resolve, reject) => {
        // Expose the functions to resolve or reject the timer promise
        this.resolveTimer = resolve;
        this.rejectTimer = reject;
        this.cancelationToken = setTimeout(async () => {
          try {
            resolve(await this.flush());
          } catch (err) {
            reject(err);
          }
        }, this.maxSeconds * 1000);
      });
    }

    return this.timer;
  }

  async flush() {
    if (this.flushing) {
      return;
    }

    this.flushing = true;

    try {
      const data = this.queue.join('\n');
      this.queue = [];

      const result = await this.sink(data);

      if (this.timer) {
        clearTimeout(this.cancelationToken);
        this.resolveTimer(result);
      }
    } catch (err) {
      if (this.timer) {
        this.rejectTimer(err);
      }
    } finally {
      this.timer = null;
      this.flushing = false;
    }
  }
};
