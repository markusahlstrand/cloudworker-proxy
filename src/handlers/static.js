module.exports = function staticHandler({
    body = '',
    headers = {},
    status = '200',
}) {
  return async (ctx) => {    
    ctx.body = body;
    ctx.status = status;
    ctx.headers = headers;
  };
};
