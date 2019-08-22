module.exports = function originHandler(options) {
  const { localOriginOverride } = options;

  return async (ctx) => {
    // ctx.status = 200;

    // try {
    const url = process.env.LOCAL
      ? `${localOriginOverride || ctx.request.origin}${ctx.request.path}`
      : ctx.request.href;

    const requestOptions = {
      headers: ctx.request.headers,
      method: ctx.request.method,
      body: ctx.request.body,
    };

    // eslint-disable-next-line no-undef
    const response = await fetch(url, requestOptions);

    ctx.body = response.body;
    ctx.status = response.status;
    ctx.headers = response.headers;

    // ctx.body = JSON.stringify({
    //   status: response.status,
    //   headers: response.headers,
    //   requestHeaders: ctx.request.headers,
    // });
    // ctx.headers = response.headers;
    // } catch (err) {
    //   ctx.body = err.message;
    // }
  };
};
