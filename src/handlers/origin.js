module.exports = function originHandler(options) {
  const { localOriginOverride } = options;

  return async (ctx) => {
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
  };
};
