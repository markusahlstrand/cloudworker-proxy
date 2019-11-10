module.exports = function responseHandler({ body = '', headers = {}, status = 200 }) {
  return async (ctx) => {
    if (body instanceof Object) {
      ctx.body = JSON.stringify(body);
      ctx.set('Content-Type', 'application/json');
    } else {
      ctx.body = body;
    }

    ctx.status = status;

    Object.keys(headers).forEach((key) => {
      ctx.set(key, headers[key]);
    });
  };
};
