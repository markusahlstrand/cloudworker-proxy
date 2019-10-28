module.exports = function responseHandler({ body = '', headers = {}, status = 200 }) {
  return async (ctx) => {
    ctx.body = body;
    ctx.status = status;

    Object.keys(headers).forEach((key) => {
      ctx.set(key, headers[key]);
    });
  };
};
