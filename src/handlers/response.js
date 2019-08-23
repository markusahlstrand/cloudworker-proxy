module.exports = function responseHandler({ body = '', headers = {}, status = '200' }) {
  return async (ctx) => {
    ctx.body = body;
    ctx.status = status;
    ctx.headers = { headers, ...ctx.headers };
  };
};
