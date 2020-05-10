const { AwsClient } = require('aws4fetch');
const utils = require('../utils');

function s3HandlerFactory({ accessKeyId, secretAccessKey, bucket, region }) {
  const aws = new AwsClient({
    accessKeyId,
    region,
    secretAccessKey,
  });

  return async (ctx) => {
    const url = utils.resolveParams(`https://${bucket}.s3.amazonaws.com/{file}`, ctx.params);

    const headers = {};

    if (ctx.request.headers.range) {
      headers.range = ctx.request.headers.range;
    }

    const response = await aws.fetch(url, {
      method: ctx.method,
      headers,
    });

    ctx.status = response.status;
    ctx.body = response.body;
    const responseHeaders = utils.instanceToJson(response.headers);
    Object.keys(responseHeaders).forEach((key) => {
      ctx.set(key, responseHeaders[key]);
    });
  };
}

module.exports = s3HandlerFactory;
