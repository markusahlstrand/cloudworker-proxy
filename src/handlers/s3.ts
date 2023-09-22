import { AwsClient } from 'aws4fetch';
import utils from '../utils';
import constants from '../constants';

function getEndpoint(
  endpoint?: string,
  options: { region?: string; bucket?: string; forcePathStyle?: boolean } = {},
) {
  // See https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-bucket-intro.html
  if (endpoint && options.forcePathStyle) {
    const url = new URL(endpoint);
    return `${url.protocol}//${url.host}/${options.bucket}`;
  }
  if (endpoint) {
    const url = new URL(endpoint);
    return `${url.protocol}//${options.bucket}.${url.host}`;
  }
  if (options.forcePathStyle && options.region) {
    return `https://s3.${options.region}.amazonaws.com/${options.bucket}`;
  }
  if (options.forcePathStyle) {
    return `https://s3.amazonaws.com/${options.bucket}`;
  }
  if (options.region) {
    return `https://${options.bucket}.s3.${options.region}.amazonaws.com`;
  }
  return `https://${options.bucket}.s3.amazonaws.com`;
}

export default function s3HandlerFactory({
  accessKeyId,
  secretAccessKey,
  bucket,
  region,
  endpoint,
  forcePathStyle,
  enableBucketOperations = false,
}: {
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  region?: string;
  endpoint?: string;
  forcePathStyle?: boolean;
  enableBucketOperations?: boolean;
}) {
  const aws = new AwsClient({
    accessKeyId,
    region,
    secretAccessKey,
  });

  const resolvedEndpoint = getEndpoint(endpoint, {
    region,
    bucket,
    forcePathStyle,
  });

  return async (ctx) => {
    if (ctx.params.file === undefined && !enableBucketOperations) {
      ctx.status = 404;
      ctx.body = constants.http.statusMessages['404'];
      ctx.set('Content-Type', 'text/plain');
      return;
    }

    const url = ctx.params.file
      ? utils.resolveParams(`${resolvedEndpoint}/{file}`, ctx.params)
      : resolvedEndpoint; // Bucket operations

    const headers = ctx.request.headers || {};

    const response = await aws.fetch(url + (ctx.request.search || ''), {
      method: ctx.method || ctx.request.method,
      headers,
      ...(ctx.request.body && { body: ctx.request.body }),
    });

    ctx.status = response.status;
    ctx.body = response.body;
    const responseHeaders = utils.instanceToJson(response.headers);
    Object.keys(responseHeaders).forEach((key) => {
      ctx.set(key, responseHeaders[key]);
    });
  };
}
