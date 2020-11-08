class Context {
  constructor() {
    this.request = {
      query: {},
      headers: {},
    };
    this.event = {};
    this.state = {};
    this.response = {
      headers: new Map(),
    };
    this.body = '';
    this.status = 404;

    // Shortcuts directly on the context
    this.query = this.request.query;
  }

  /**
   * Gets a header from the request
   * @param {string} key
   */
  header(key) {
    return this.request.headers.get(key);
  }

  set(key, value) {
    this.response.headers.set(key, value);
  }
}

/**
 * A minimal ctx used for testing
 */
function getCtx() {
  const ctx = new Context();
  ctx.request.method = 'GET';
  ctx.request.headers.origin = 'localhost';
  ctx.request.hostname = 'example.com';
  ctx.request.host = 'example.com';
  ctx.request.protocol = 'http';

  return ctx;
}

/**
 * Returns an empty function that can be used to terminate routes when testing
 */
function getNext() {
  return async (ctx) => {
    ctx.status = 200;
    ctx.body = 'A test helper';
  };
}

module.exports = {
  getCtx,
  getNext,
};
