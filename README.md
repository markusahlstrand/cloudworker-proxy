# cloudworker-proxy

THIS IS STILL WORK IN PROGRESS AND THERE MAY BE BREAKING CHANGES EVEN IN MINOR RELEASES.

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
    name: "static",
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
    name: 'ratelimit',
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
    name: 'logger',
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
    name: 'basicAuth',
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

### Apikeys

The api keys handler reads the `X-Api-Key` header, with a fallback to `?apikey=..` querystring, and adds a jwt token to the authorizion header if there's a match. The jwt access and refresh tokens are stored in a cloudflare Key Value Storage.

The handler renews the access tokens once they expire using the refresh token. It doesn't validate the access token but only ads it to the request headers so that it can be validated using the jwt handler.

There's a separate api-key-api handler to add, remove or list a api keys.

An example of the configuration for the apikey handler:

```
config = [{
    name: 'apikeys',
    options: {
        oauthClientId: <OAUTH2_CLIENT_ID>,
        oauth2ClientSecret: <OAUTH2_CLIENT_SECRET>,
        oauth2AuthDomain: <OAUTH2_AUTH_DOMAIN>,
        kvAccountId: <KV_ACCOUNT_ID>,
        kvNamespace: <KV_NAMESPACE>,
        kvAuthEmail: <KV_AUTH_EMAIL>,
        kvAuthKey: <KV_AUTH_KEY>,
    },
}];
```

### Apikeys api

Exposes an POST endpoint to create a new api key based on the current oauth2 session and hence the handler must be added after the jwt handler. The handler stores a document for each user in cloudflare Key Value Storage with the api keys and their corresponding access/refesh tokens.

An example of the configuration for the apikey api handler:

```
config = [{
    name: 'apikeysApi',
    options: {
        createPath: '/apikeys',
        kvAccountId: <KV_ACCOUNT_ID>,
        kvNamespace: <KV_NAMESPACE>,
        kvAuthEmail: <KV_AUTH_EMAIL>,
        kvAuthKey: <KV_AUTH_KEY>,
    },
}];
```

### Split

Splits the request in two separate requests. The duplicated request will not return any results to the client, but can for instance be used to sample the traffic on a live website or to get webhooks to post to multiple endpoints.

The split handler takes a host parameter that lets you route the requests to a different origin.

An example of the configuration for the split handler:

```
config = [{
    name: 'split',
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
    name: "response",
    options: {
      body: "Hello world"
    }
  }
];
```

### CORS

Adds cross origin request headers for a path. The cors handler can optionally take an array of allowed origins to enable cors for.

An example of the configuration for cors handler:

```
config = [{
    name: 'cors',
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
    name: 'loadbalancer',
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
    name: 'loadbalancer',
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
    name: 'loadbalancer',
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

Requests made by the loadbalancer handler would not be cached when using standard fetch-calls as the source isn't proxied by cloudflare. Instead the handler uses the cache-api to manually store the response in the cloudflare cache. The responses are cached according to the cache-headers. If the ´cacheOverride`-option is added to the loadbalancer it will bypass the cache api and use standard fetch requests.

### Origin

Passes the request to the origin for the cdn. This is typically used as a catch all handler to pass all requests that the worker shouldn't handle to origin.

As this wouldn't work when running locall it's possible to specify another host name that will be used for debugging locally.

An example of the configuration for the origin handler:

```
config = [{
    name: 'origin',
    options: {
        localOriginOverride: 'https://some.origin.com',
    }
}];
```

### Lambda

Invoke a AWS lambda using http without the AWS api gateway. The API Gateway from AWS is rather expensive for high load scenarios and using workers as a gateway is almost 10 times cheaper and much more flexible.

An example of the configuration for the lambda handler:

```
config = [{
    name: 'lambda',
    options: {
      region: 'us-east-1',
      lambdaName: 'lambda-hello-dev-hello',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
}];
```

### Transform

The transform handler uses regexes to replace text in the responses. It can for instance be used to update relative paths in response from sources hosted on different domains or to insert scripts in web pages.

The transformer in applied as a middleware and hence need to be added before the handler that fetches the data to transform.

The replace parameter can take parameters from the regex match using `{{$0}}`, where the number is the index of the capturing group.

The current implementation of tranforms have a few limitations:

- If the size of the response get larger than about 5 MB it will use more cpu than the limit on cloudflare and fail.
- If the string to be replaced is split between two chunks it won't currently work. The solution is likely to ensure that the chunks always contains complete rows which is sufficient for most cases.

An example of the configuration for the origin handler:

```
config = [{
    name: 'tranform',
    options: {
        tranforms: [
            {
                regex: 'foo',
                replace: 'bar'
            }
        ]
    }
}];
```

## Security

The hanlders api-keys and oauth2 only stores AES encrypted access and refresh-tokens in storage. The encryption keys are sent as part of the request from the user, so in order to get a valid token you need to have access both to the storage and a request from a user.

The tokens entries have a ttl of one month by default, so any token that hasn't been accessed in a month will automatically be removed.

## Examples

For more examples of usage see the example folder which contains a complete solution deployed using serverless
