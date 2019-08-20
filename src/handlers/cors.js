module.exports = function corsHandler({ allowedOrigins = ['*'] }) {
  return async (ctx, next) => {
    const origin = ctx.request.headers.get('origin');

    if (allowedOrigins[0] === '*' || allowedOrigins.indexOf(origin) !== -1) {
      ctx.set('Access-Control-Allow-Credentials', 'true');
      ctx.set('Access-Control-Allow-Origin', origin);
      ctx.set('Access-Control-Allow-Methods', 'GET,PUT,POST,PATCH,DELETE,HEAD,OPTIONS');
      ctx.set('Access-Control-Allow-Headers', 'Content-Type');
      ctx.set('Access-Control-Expose-Headers', 'WWW-Authenticate,Server-Authorization');
    }

    return next(ctx);
  };
};
