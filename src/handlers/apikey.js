module.exports = function apikeyHandler({}) {
    return async (ctx, next) => {
        const apiKey = ctx.request.headers['x-api-key'];

        if (!apiKey) {
            return next(ctx);
        }

        const [segments] = apiKey.split('.');

      // Split the api key 

      // Check for the user entry in kv storage

      return next(ctx);
    };
  };
  