module.exports = function fallthroughHandler() {
  return async (ctx) => {
    // eslint-disable-next-line no-undef
    const response = await fetch(cxt.request);

    ctx.body = response.body();
    ctx.status = response.status;
    ctx.headers = response.headers;
  };
};
