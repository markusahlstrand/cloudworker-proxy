import lodashGet from 'lodash.get';
import constants from '../constants';
import utils from '../utils';

const _ = {
  get: lodashGet,
};

function filterCfHeaders(headers) {
  const result = {};

  Object.keys(headers).forEach((key) => {
    if (!key.startsWith('cf')) {
      result[key] = headers[key];
    }
  });

  return result;
}

export default function originHandler(options) {
  const { localOriginOverride } = options;

  return async (ctx) => {
    const url = process.env.LOCAL
      ? `${localOriginOverride || ctx.request.origin}${ctx.request.path}`
      : ctx.request.href;

    const requestOptions = {
      headers: filterCfHeaders(ctx.request.headers),
      method: ctx.request.method,
      redirect: 'manual',
    };

    if (
      constants.methodsMethodsWithBody.indexOf(ctx.request.method) !== -1 &&
      _.get(ctx, 'event.request.body')
    ) {
      const clonedRequest = ctx.event.request.clone();
      requestOptions.body = clonedRequest.body;
    }

    const response = await fetch(url, requestOptions);

    ctx.body = response.body;
    ctx.status = response.status;
    const responseHeaders = utils.instanceToJson(response.headers);
    Object.keys(responseHeaders).forEach((key) => {
      ctx.set(key, responseHeaders[key]);
    });
  };
}
