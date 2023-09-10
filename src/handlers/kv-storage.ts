import KvStorage from '../services/kv-storage';
import constants from '../constants';
import utils from '../utils';

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

export default function kvStorageHandler({
  kvAccountId,
  kvNamespace,
  kvAuthEmail,
  kvAuthKey,
  kvBasePath = '',
  kvKey = '{file}',
  defaultExtension = 'html',
  defaultIndexDocument,
  defaultErrorDocument,
  mime = {},
  mode = 'rest',
}) {
  const kvStorage = new KvStorage({
    accountId: kvAccountId,
    namespace: kvNamespace,
    authEmail: kvAuthEmail,
    authKey: kvAuthKey,
    mode,
  });

  const mimeMappings = { ...constants.mime, ...mime };

  return async (ctx) => {
    const path = utils.resolveParams(kvKey, ctx.params);

    const key =
      path === '' && defaultIndexDocument
        ? defaultIndexDocument
        : setDefaultLocation(path, defaultExtension);

    let result = await kvStorage.get(kvBasePath + key);

    if (!result && defaultErrorDocument) {
      result = await kvStorage.get(kvBasePath + defaultErrorDocument);
    }

    if (result) {
      ctx.status = 200;
      ctx.body = result;
      ctx.set('Content-Type', mimeMappings[key.split('.').pop()] || 'text/plain');
    } else {
      ctx.status = 404;
      ctx.body = constants.http.statusMessages['404'];
      ctx.set('Content-Type', 'text/plain');
    }
  };
}
