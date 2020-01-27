const { AwsClient } = require('aws4fetch');

function instanceToJson(instance) {
  return [...instance].reduce((obj, item) => {
    const prop = {};
    // eslint-disable-next-line prefer-destructuring
    prop[item[0]] = item[1];
    return { ...obj, ...prop };
  }, {});
}

function lambdaHandlerFactory({ accessKeyId, secretAccessKey, region, lambdaName }) {
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
    const responseHeaders = instanceToJson(response.headers);
    Object.keys(responseHeaders).forEach((key) => {
      ctx.set(key, responseHeaders[key]);
    });
  };
}

module.exports = lambdaHandlerFactory;
