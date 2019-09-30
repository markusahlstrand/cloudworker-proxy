module.exports = function splitHandler({ host }) {
  if (!host) {
    throw new Error('Need to specify a host for the split middleware.');
  }

  return async (ctx, next) => {
    const duplicateContext = ctx.clone();
    duplicateContext.request = {
      host,
      ...duplicateContext.request,
    };

    // eslint-disable-next-line no-undef
    ctx.event.waitUntil(next(duplicateContext));

    return next(ctx);
  };
};
