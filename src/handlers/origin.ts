import { Context } from 'hono';

function filterCfHeaders(headers: Headers, host: string) {
  const filteredHeaders = new Headers();

  for (const key in headers.keys()) {
    const value = headers.get(key);
    if (!key.startsWith('cf') && value) {
      filteredHeaders.set(key, value);
    }
  }

  filteredHeaders.set('host', host);

  return filteredHeaders;
}

export interface OriginHandlerOptions {
  // The url that the content will be fetched from
  baseUrl: string;
  // The url of the proxy. Will be fetched from the current url if not supllied
  proxyUrl?: string;
  // Skip part o the path. If the origin handler is mapped to a sub path this can be removed from origin requests.
  skipPath?: string;
  // Changes all relative and all absolute links to the origin host to point to the proxy
  rewriteLinks?: boolean;
}

class RelativeLinkHandler {
  proxyUrl: string;
  originUrl: string;

  constructor(proxyUrl: string, originUrl: string) {
    this.proxyUrl = proxyUrl;
    this.originUrl = originUrl;
  }

  element(element: Element) {
    const srcAttribute = element.getAttribute('src');
    if (srcAttribute?.startsWith('/')) {
      element.setAttribute('src', this.proxyUrl + srcAttribute);
    } else if (srcAttribute?.startsWith(this.originUrl)) {
      element.setAttribute('src', srcAttribute.replace(this.originUrl, this.proxyUrl));
    }

    const hrefAttribute = element.getAttribute('href');
    if (hrefAttribute?.startsWith('/')) {
      element.setAttribute('href', this.proxyUrl + hrefAttribute);
    } else if (hrefAttribute?.startsWith(this.originUrl)) {
      element.setAttribute('href', hrefAttribute.replace(this.originUrl, `${this.proxyUrl}/`));
    }
  }
}

export function originHandler(options: OriginHandlerOptions) {
  return async (ctx: Context) => {
    const url = new URL(ctx.req.url);
    const { method, headers } = ctx.req;

    if (options.proxyUrl) {
      const proxyUrl = new URL(options.proxyUrl);
      url.protocol = proxyUrl.protocol;
      url.host = proxyUrl.host;
    }

    const originUrl = new URL(options.baseUrl);
    originUrl.pathname = url.pathname;

    if (options.skipPath) {
      originUrl.pathname = url.pathname.replace(options.skipPath, '');
    }

    console.log('OriginUrl: ' + originUrl.href);

    const requestOptions: RequestInit = {
      headers: filterCfHeaders(headers, originUrl.hostname),
      method,
      //   redirect: 'manual',
      body: ctx.req.body,
    };

    const response = await fetch(originUrl.href, requestOptions);

    if (response.headers.get('content-type')?.startsWith('text/html') && options.rewriteLinks) {
      return new HTMLRewriter()
        .on('a', new RelativeLinkHandler(url.href, originUrl.href))
        .on('link', new RelativeLinkHandler(url.href, originUrl.href))
        .transform(response);
    }

    return response;
  };
}
