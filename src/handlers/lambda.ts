import { AwsClient } from 'aws4fetch';
import utils from '../utils';

export default function lambdaHandlerFactory({ accessKeyId, secretAccessKey, region, lambdaName }) {
  const aws = new AwsClient({
    accessKeyId,
    secretAccessKey,
  });

  return async (ctx) => {
    const url = `https://lambda.${region}.amazonaws.com/2015-03-31/functions/${lambdaName}/invocations`;

    // TODO: Guess we should pass the body here?
    const event = {};

    const response = await aws.fetch(url, { body: JSON.stringify(event) });

    ctx.status = response.status;
    ctx.body = response.body;
    const responseHeaders = utils.instanceToJson(response.headers);
    Object.keys(responseHeaders).forEach((key) => {
      ctx.set(key, responseHeaders[key]);
    });
  };
}
