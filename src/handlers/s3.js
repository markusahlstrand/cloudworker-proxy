const { AwsClient } = require('aws4fetch');
const utils = require('../utils');

function s3HandlerFactory({
  accessKeyId,
  secretAccessKey,
  bucket,
  region,
  endpoint,
  forcePathStyle,
}) {
  const aws = new AwsClient({
    accessKeyId,
    region,
    secretAccessKey,
  });

  let resolvedEndpoint; // See https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-bucket-intro.html
  if (endpoint && forcePathStyle) {
    const url = new URL(endpoint);
    resolvedEndpoint = `${url.protocol}//${url.host}/${bucket}`;
  } else if (endpoint) {
    const url = new URL(endpoint);
    resolvedEndpoint = `${url.protocol}//${bucket}.${url.host}`;
  } else if (forcePathStyle && region) {
    resolvedEndpoint = `https://s3.${region}.amazonaws.com/${bucket}`;
  } else if (forcePathStyle) {
    resolvedEndpoint = `https://s3.amazonaws.com/${bucket}`;
  } else if (region) {
    resolvedEndpoint = `https://${bucket}.s3.${region}.amazonaws.com`;
  } else {
    resolvedEndpoint = `https://${bucket}.s3.amazonaws.com`;
  }

  return async (ctx) => {
    const url = utils.resolveParams(`${resolvedEndpoint}/{file}`, ctx.params);

    const headers = {};

    if (ctx.request.headers.range) {
      headers.range = ctx.request.headers.range;
    }

    const response = await aws.fetch(url, {
      method: ctx.method || ctx.request.method,
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
