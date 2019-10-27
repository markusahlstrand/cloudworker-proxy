// async function streamBody(ctx, readable, writable) {
//   const reader = readable.getReader();
//   const writer = writable.getWriter();

//   ctx.bytesSent = ctx.bytesSent || 0;

//   while (true) {
//     // eslint-disable-next-line no-await-in-loop
//     const { done, value } = await reader.read();

//     if (done) {
//       break;
//     }

//     ctx.bytesSent += value.byteLength;

//     // The writer throws in cloudflare if the connection is closed
//     // eslint-disable-next-line no-await-in-loop
//     await writer.write(value);
//   }

//   await writer.close();
// }
function template(data, args) {
  return data.replace(/{{\$(\d)}}/g, ($0, index) => {
    return args[parseInt(index)];
  });
}

function transformChunk(chunk, regexes) {
  return regexes.reduce((acc, transform) => {
    return acc.replace(transform.regex, (...args) => {
      return template(transform.replace, args);
    });
  }, chunk);
}

function transformFactory({ transforms = [] }) {
  const regexes = transforms.map((transform) => {
    return {
      regex: new RegExp(transform.regex),
      replace: transform.replace,
    };
  });

  return async (ctx, next) => {
    await next(ctx);

    const body = ctx.body;

    if (typeof body === 'string') {
      ctx.body = transformChunk(body, regexes);
    } else {
      throw new Error('Streams not implemented yet..');
    }
  };
}

module.exports = transformFactory;
