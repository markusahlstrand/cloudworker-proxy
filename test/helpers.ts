class Context {
  request: {
    method: string;
    path: string;
    query: {};
    hostname: string;
    host: string;
    protocol: string;
    headers: Record<string, string>;
  };
  event: {};
  state: {};
  response: { headers: Map<any, any>; body: string | undefined };
  body: object | string | undefined;
  status: number;
  query: any;
  params: Record<string, string> = {};

  constructor() {
    this.request = {
      method: 'GET',
      path: '/',
      host: 'example.com',
      hostname: 'example.com',
      protocol: 'http',
      query: {},
      headers: {},
    };
    this.event = {};
    this.state = {};
    this.response = {
      headers: new Map(),
      body: undefined,
    };
    this.body = undefined;
    this.status = 404;

    // Shortcuts directly on the context
    this.query = this.request.query;
  }

  set(key: string, value: string) {
    this.response.headers.set(key, value);
  }
  header(key: string) {
    return this.response.headers.get(key);
  }
}

/**
 * A minimal ctx used for testing
 */
function getCtx() {
  const ctx = new Context();
  ctx.request.headers.origin = 'localhost';
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

export default {
  getCtx,
  getNext,
};
