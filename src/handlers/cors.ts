export default function corsHandler({
  allowedOrigins = ['*'],
  allowedMethods = ['GET', 'PUT', 'POST', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
  allowCredentials = true,
  allowedHeaders = ['Content-Type'],
  allowedExposeHeaders = ['WWW-Authenticate', 'Server-Authorization'],
  maxAge = 600,
  optionsSuccessStatus = 204,
  terminatePreflight = false,
}) {
  return async (ctx, next) => {
    const { method } = ctx.request;
    const { origin } = ctx.request.headers;
    const requestHeaders = ctx.request.headers['access-control-request-headers'];

    configureOrigin(ctx, origin, allowedOrigins);
    configureCredentials(ctx, allowCredentials);
    configureExposedHeaders(ctx, allowedExposeHeaders);
    // handle preflight requests
    if (method === 'OPTIONS') {
      configureMethods(ctx, allowedMethods);
      configureAllowedHeaders(ctx, requestHeaders, allowedHeaders);
      configureMaxAge(ctx, maxAge);
      if (terminatePreflight) {
        ctx.status = optionsSuccessStatus;
        ctx.set('Content-Length', '0');
        ctx.body = '';
        return;
      }
    }
    await next(ctx);
  };
}

function configureOrigin(ctx, origin, allowedOrigins) {
  if (Array.isArray(allowedOrigins)) {
    if (allowedOrigins[0] === '*') {
      ctx.set('Access-Control-Allow-Origin', '*');
    } else if (allowedOrigins.indexOf(origin) !== -1) {
      ctx.set('Access-Control-Allow-Origin', origin);
      ctx.set('Vary', 'Origin');
    }
  }
}

function configureCredentials(ctx, allowCredentials) {
  if (allowCredentials) {
    ctx.set('Access-Control-Allow-Credentials', allowCredentials);
  }
}

function configureMethods(ctx, allowedMethods) {
  ctx.set('Access-Control-Allow-Methods', allowedMethods.join(','));
}

function configureAllowedHeaders(ctx, requestHeaders, allowedHeaders) {
  if (allowedHeaders.length === 0 && requestHeaders) {
    ctx.set('Access-Control-Allow-Headers', requestHeaders); // allowedHeaders wasn't specified, so reflect the request headers
  } else if (allowedHeaders.length) {
    ctx.set('Access-Control-Allow-Headers', allowedHeaders.join(','));
  }
}

function configureMaxAge(ctx, maxAge) {
  if (maxAge) {
    ctx.set('Access-Control-Max-Age', maxAge);
  }
}

function configureExposedHeaders(ctx, allowedExposeHeaders) {
  if (allowedExposeHeaders.length) {
    ctx.set('Access-Control-Expose-Headers', allowedExposeHeaders.join(','));
  }
}
