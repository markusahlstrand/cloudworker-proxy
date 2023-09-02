// const utils = require('../utils');

// module.exports = function responseHandler({ body = '', headers = {}, status = 200 }) {
//   return async (ctx) => {
//     if (body instanceof Object) {
//       ctx.body = JSON.stringify(body);
//       ctx.set('Content-Type', 'application/json');
//     } else {
//       ctx.body = utils.resolveParams(body, ctx.params);
//     }

//     ctx.status = status;

//     Object.keys(headers).forEach((key) => {
//       ctx.set(key, utils.resolveParams(headers[key], ctx.params));
//     });
//   };
// };

export interface ResponseParams {
  body: string;
  headers?: { [key: string]: string };
  status?: number;
}

export async function response(params: ResponseParams) {
  return new Response(params.body, {
    headers: (params.headers = {}),
    status: (params.status = 200),
  });
}
