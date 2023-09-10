async function streamBody(readable, writable, regexes) {
  const reader = readable.getReader();
  const writer = writable.getWriter();

  const textDecoder = new TextDecoder();
  const textEncoder = new TextEncoder();

  // eslint-disable-next-line no-constant-condition
  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    const chunk = textDecoder.decode(value);
    const transformedChunk = transformChunk(chunk, regexes);
    const encodedText = textEncoder.encode(transformedChunk);

    // The writer throws in cloudflare if the connection is closed
    // eslint-disable-next-line no-await-in-loop
    await writer.write(encodedText);
  }

  await writer.close();
}

function template(data, args) {
  return data.replace(/{{\$(\d)}}/g, ($0, index) => {
    return args[parseInt(index, 10)];
  });
}

function transformChunk(chunk, regexes) {
  return regexes.reduce((acc, transform) => {
    return acc.replace(transform.regex, (...args) => {
      return template(transform.replace, args);
    });
  }, chunk);
}

export default function transformFactory({ transforms = [], statusCodes = [200] }) {
  const regexes = transforms.map((transform) => {
    return {
      regex: new RegExp(transform.regex, 'g'),
      replace: transform.replace,
    };
  });

  return async (ctx, next) => {
    await next(ctx);

    const { body } = ctx;

    if (statusCodes.indexOf(ctx.status) === -1) {
      // Only tranform on matching statuscodes
    } else if (typeof body === 'string') {
      ctx.body = transformChunk(body, regexes);
    } else {
      // eslint-disable-next-line no-undef
      const { readable, writable } = new TransformStream();
      streamBody(body, writable, regexes);
      ctx.body = readable;
    }
  };
}
