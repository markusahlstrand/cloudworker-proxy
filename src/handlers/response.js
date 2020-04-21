function resolveParams(data, params = {}) {
  return Object.keys(params).reduce((acc, key) => acc.replace(`{${key}}`, params[key]), data);
}

module.exports = function responseHandler({ body = '', headers = {}, status = 200 }) {
  return async (ctx) => {
    if (body instanceof Object) {
      ctx.body = JSON.stringify(body);
      ctx.set('Content-Type', 'application/json');
    } else {
      ctx.body = resolveParams(body, ctx.params);
    }

    ctx.status = status;

    Object.keys(headers).forEach((key) => {
      ctx.set(key, resolveParams(headers[key], ctx.params));
    });
  };
};
