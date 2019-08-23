# cloudworker-proxy

An api gateway for cloudflare workers with configurable handlers for:

- Routing
  - Load balancing of http endpoints
  - Invoking AWS lambdas and google cloud functions
  - Static responses
- Logging (http, kinesis)
- Authentication (basic, oauth2)
- Rate limiting
- Rewrite
  - Modifying headers
  - Adding cors headers

## Usage

A proxy is instanciated with a set of rules that are matched against each request based on hostname, method and path. Each rule is configured to execute one of the predefined handlers. The hanlders could either terminate the request and send the response to the client or pass on the request to the following handlers matching the request.

A simple hello world proxy:

```
const Proxy = require('cloudworker-proxy');

const rules = [
  {
    handlerName: "static",
    options: {
      body: "Hello world"
    }
  }
];

const proxy = new Proxy(rules);

async function fetchAndApply(event) {
    return await proxy.resolve(event);
}

addEventListener('fetch', (event) => {
  event.respondWith(fetchAndApply(event));
});

```

## Handlers

### Response

Returns a static response to the request.

An example of configuration for a static handler:

```
const rules = [
  {
    handlerName: "response",
    options: {
      body: "Hello world"
    }
  }
];
```

### Logging

The logging handler supports logging of requests and errors to http endpoints such as logz.io and AWS Kinesis.

The logs are sent in chunks to the server. The chunks are sent when the predefined limit of messages are reached or after a certain time, whatever comes first.

An example of configuration for a http logger:

```
rules = [{
    handlerName: 'logger',
    options: {
        type: 'http',
        url: process.env.LOGZ_URL,
        contentType: 'text/plain',
        delimiter: '_',
    },
}];

```

### Basic Auth

Uses basic auth to protect matching rules. The username and authTokens (base64-encoded versions of the passwords) are stored straight in the config which works fine for simple scenarios, but makes adding and removing users hard.

An example of the configuration for the basic auth handler:

```
rules = [{
    handlerName: 'basicAuth',
    path: '/basic',
    options: {
      users: [
        {
            username: 'test',
            authToken: 'dGVzdDpwYXNzd29yZA==', // "password" Base64 encoded
        }
      ]
    }
}];
```

### Load balancer

### Origin

Passed the request to the origin for the cdn. This is typically used as a catch all handler to pass all requests that the worker shouldn't handle to origin.

As this wouldn't work when running locall it's possible to specify another host name that will be used for debugging locally.

An example of the configuration for the origin handler:

```
rules = [{
    handlerName: 'origin',
    options: {
        localOriginOverride: 'https://some.origin.com',
    }
}];
```

### Cors

Adds cross origin request headers for a path.

An example of the configuration for cors handler:

```
rules = [{
    handlerName: 'cors',
    options: {}
}];
```

### Ratelimit

Ratelimit the matching requests per minute per IP or for all clients.

The ratelimit keeps the counters in memory so different edge nodes will have separate counters. For IP-based ratelimits it should work just fine as the requests from a client will hit the same edge node.

The ratelimit can have different scopes, so a proxy can have multiple rate-limits for different endpoints.

The ratelimit adds the following headers to the response object:

- X-Ratelimit-Limit. This is the current limit being enforced
- X-Ratelimit-Count. The current count of requests being made within the window
- X-Ratelimit-Reset. The timeperiod in seconds until the rate limit is reset.

An example of the configuration for ratelimit handler:

```
rules = [{
    handlerName: 'ratelimit',
    options: {
        limit: 1000, // The default allowed calls
        scope: 'default',
        type: 'IP', // Anything except IP will sum up all calls
    }
}];
```

## Examples

For more examples of usage see the example folder which contains a complete solution deployed using serverless
