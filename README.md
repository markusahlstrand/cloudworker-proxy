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

## Concept

The proxy is a pipeline of different handlers that processes each request. The handlers in the pipeline could be:
- Middleware. Such as logging or authentication that typically passes on the request further down the pipeline
- Origins. Fetches content from other services, for instance using http.
- Tranforms. Modifies the content before passing it back to the client

Each handler can specify rules for which hosts and paths it should apply to, so it's possible to for instance only apply authentication to certain requests.

## Usage

A proxy is instanciated with a set of middlewares, origins and transforms that are matched against each request based on hostname, method and path. Each rule is configured to execute one of the predefined handlers. The handlers could either terminate the request and send the response to the client or pass on the request to the following handlers matching the request.

A simple hello world proxy:

```
const Proxy = require('cloudworker-proxy');

const config = [{
    handlerName: "static",
    options: {
    body: "Hello world"
    }
}];

const proxy = new Proxy(config);

async function fetchAndApply(event) {
    return await proxy.resolve(event);
}

addEventListener('fetch', (event) => {
  event.respondWith(fetchAndApply(event));
});

```

## Handlers

### Ratelimit

Ratelimit the matching requests per minute per IP or for all clients.

The ratelimit keeps the counters in memory so different edge nodes will have separate counters. For IP-based ratelimits it should work just fine as the requests from a client will hit the same edge node.

The ratelimit can have different scopes, so a proxy can have multiple rate-limits for different endpoints.

The ratelimit adds the following headers to the response object:

- X-Ratelimit-Limit. This is the current limit being enforced
- X-Ratelimit-Count. The current count of requests being made within the window
- X-Ratelimit-Reset. The timeperiod in seconds until the rate limit is reset.

HEAD and OPTIONS requests are not counted against the limit.

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

### Logging

The logging handler supports logging of requests and errors to http endpoints such as logz.io and AWS Kinesis.

The logs are sent in chunks to the server. The chunks are sent when the predefined limit of messages are reached or after a certain time, whatever comes first.

An example of configuration for a http logger:

```
config = [{
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

An example of the configuration for the basic auth middleware:

```
config = [{
    handlerName: 'basicAuth',
    path: '/basic',
    options: {
        users: [
            {
                username: 'test',
                authToken: 'dGVzdDpwYXNzd29yZA==', // "password" Base64 encoded
            }
        ],
    },
}];
```

### Split

Splits the request in two separate requests. The duplicated request will not return any results to the client, but can for instance be used to sample the traffic on a live website or to get webhooks to post to multiple endpoints.

The split handler takes a host parameter that lets you route the requests to a different origin.

An example of the configuration for the split middleware:

```
config = [{
    handlerName: 'split',
    options: {
        host: 'test.example.com',
    },
}];
```

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

### Cors

Adds cross origin request headers for a path. The cors handler can optionally take an array of allowed origins to enable cors for.

An example of the configuration for cors handler:

```
config = [{
    handlerName: 'cors',
    options: {
        allowedOrigins: ['http://domain.com'],
    }
}];
```

### Load balancer

Load balances requests between one or many endpoints.

Currently the load balancer distributes the load between the endpoints randomly. Use cases for this handler are:

- Load balance between multiple ingress servers in kubernetes
- Route trafic to providers that doesn't support custom domains easliy, such as google cloud functions
- Route trafic to cloud services with nested paths such as AWS Api Gateway or google cloud functions.
- Route trafic to different endpoints and having flexibility to do updates without changing the origin servers.

In some cases it is necessary to resolve the IP of the endpoint based on a different url than the host header. One example of this is when the load is distributed over multiple load balancer nodes that host multiple domains or subdomains. In these cases it's possible to set the resolveOverride on the load balancer handler. This way it will resolve the IP according to url property of the source, but use the resolveOverride as host header. NOTE: this is only possible if the host is hosted via the cloudflare cdn.

An example of the configuration for loadbalancer with a single source on google cloud functions:

```
config = [{
    handlerName: 'loadbalancer',
    options: {
        sources: [
            {
                url: 'https://europe-west1-ahlstrand.cloudfunctions.net/hello/{file}'
            }
        ]
    }
}];
```

An example of the configuration for loadbalancing traffic between two ingresses for multiple hosts, with an override of the host header:

```
config = [{
    handlerName: 'loadbalancer',
    path: '/:file*',
    options: {
        "resolveOverride": "www.ahlstrand.es",
        "sources": [
            {
                "url": "https://rancher-ingress-1.ahlstrand.es/{file}"
            },
            {
                "url": "https://rancher-ingress-2.ahlstrand.es/{file}"
            },
        ]
    }
}];
```

Using path and host parameters the handler can be more generic:

```
config = [{
    handlerName: 'loadbalancer',
    path: '/:file*',
    host: ':host.ahlstrand.es',
    options: {
        "resolveOverride": "{host}.ahlstrand.es",
        "sources": [
            {
                "url": "https://rancher-ingress-1.ahlstrand.es/{file}"
            },
            {
                "url": "https://rancher-ingress-2.ahlstrand.es/{file}"
            },
        ]
    }
}];
```

### Origin

Passed the request to the origin for the cdn. This is typically used as a catch all handler to pass all requests that the worker shouldn't handle to origin.

As this wouldn't work when running locall it's possible to specify another host name that will be used for debugging locally.

An example of the configuration for the origin handler:

```
config = [{
    handlerName: 'origin',
    options: {
        localOriginOverride: 'https://some.origin.com',
    }
}];
```

## Examples

For more examples of usage see the example folder which contains a complete solution deployed using serverless
