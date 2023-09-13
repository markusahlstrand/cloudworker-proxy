import lodashGet from 'lodash.get';
import constants from '../constants';
import utils from '../utils';

const _ = {
  get: lodashGet,
};

function setDefaultLocation(url, defaultExtension, defaultIndexDocument) {
  if (url === '/' && defaultIndexDocument) {
    return defaultIndexDocument;
  }

  const file = url.split('/').pop();
  const extention = file.split('.').pop();
  if (extention !== file) {
    return url;
  }

  return `${url}.${defaultExtension}`;
}

function validateEtag(request, response) {
  const requestEtag = _.get(request, 'headers.if-none-match');
  const responseEtag = _.get(response, 'metadata.headers.etag');

  if (!requestEtag) {
    return false;
  }

  return requestEtag === responseEtag;
}

export default function kvStorageHandler({
  kvNamespaceBinding,
  kvBasePath = '',
  kvKey = '{file}',
  defaultExtension = 'html',
  defaultIndexDocument,
  defaultErrorDocument,
}) {
  async function get(key) {
    const response = await global[kvNamespaceBinding].getWithMetadata(key);

    return response;
  }

  return async (ctx) => {
    const path = utils.resolveParams(kvKey, ctx.params);

    const key =
      path === '' && defaultIndexDocument
        ? defaultIndexDocument
        : setDefaultLocation(path, defaultExtension);

    let result = await get(kvBasePath + key);

    if (!result && defaultErrorDocument) {
      result = await get(kvBasePath + defaultErrorDocument);
    }

    if (result) {
      if (validateEtag(ctx.request, result)) {
        ctx.status = 304;
      } else {
        ctx.status = result.status;
        ctx.body = result.value;

        const headers = _.get(result, 'metadata.headers', {});

        Object.keys(headers).forEach((header) => {
          ctx.set(header, headers[header]);
        });
      }
    } else {
      ctx.status = 404;
      ctx.body = constants.http.statusMessages['404'];
      ctx.set('Content-Type', 'text/plain');
    }
  };
}
