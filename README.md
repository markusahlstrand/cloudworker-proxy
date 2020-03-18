# cloudworker-proxy

An api gateway for cloudflare workers with configurable handlers for:

- Routing
  - Load balancing of http endpoints
  - Routing based on client Geo
  - Invoking AWS lambdas and google cloud functions
  - Static responses from config or Cloudflare KV-Storage
  - Splitting requests to multiple endpoints
- Logging (http, kinesis)
- Authentication (basic, oauth2)
- Rate limiting
- Rewrite
  - Modifying headers
  - Adding cors headers
  - Replacing or inserting content

## Installing

Installing via NPM:

```
npm install cloudworker-proxy --save
```

## Concept

The proxy is a pipeline of different handlers that processes each request. The handlers in the pipeline could be:

- Middleware. Such as logging or authentication that typically passes on the request further down the pipeline
- Origins. Fetches content from other services, for instance using http.
- Tranforms. Modifies the content before passing it back to the client

Each handler can specify rules for which hosts and paths it should apply to, so it's possible to for instance only apply authentication to certain requests.

The examples are deployed at https://proxy.cloudproxy.io

## Usage

A proxy is instantiated with a set of middlewares, origins and transforms that are matched against each request based on hostname, method, path and headers. Each rule is configured to execute one of the predefined handlers. The handlers could either terminate the request and send the response to the client or pass on the request to the following handlers matching the request.

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

## Default Handlers

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
    handlerName: 'rateLimit',
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

An example of configuration for a kinesis logger:

```
config = [{
    handlerName: 'logger',
    options: {
      type: 'kinesis',
      region: 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      streamName: 'cloudworker-proxy',
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

### Oauth2

Logs in using standard oauth2 providers. So far tested with Auth0, AWS Cognito and Patreon but should work with any.

It stores a session for each user in KV-storage and adds the access token as bearer to the context. The oauth2 handler does not validate the tokens, the validation is handled by the jwt-handler which typically is added after the oauth2-handler.

The redirect back from the oauth2 flow sets a session cookie and stores the access and refresh tokens in KV-storage. By setting the oauth2CallbackType to query the session token will be added to the querystring instead.

The handler by default automaticly redirect the client when it requests any matching resources. If login is optional the allowPublicAccess property can be set to true in which case the login needs to be explicitly triggered using the `oauth2LoginPath` which defaults to `/login`. The login endpoint takes a `redirectTo` query string parameter to determine where the user if redirected after the login flow.

The handler supports the following options:

- cookieName, the name of the cookie set by the handler. Defaults to 'proxy'
- cookieHttpOnly, optional property to set if the cookies should be http only (https://owasp.org/www-community/HttpOnly). Defaults to true
- allowPublicAccess, determines if any requests without valid cookies should be redirected to the login page. Defaults to true
- kvAccountId, the account id for the KV storage account
- kvNamespace, the namespace for the KV storage account
- kvAuthEmail, the email for the KV storage account
- kvAuthKey, the auth key for the KV storage account
- kvTtl, the time to live for sessions in the KV storage account. The ttl is reset each time a new access token is fetched. Defaults to 2592000 which is roughly a month
- oauth2AuthDomain, the base path for the oauth2 provider
- oauthClientId, the oauth2 client id
- oauth2ClientSecret, the oauth2 client secret
- oauth2Audience, the oauth2 audience. This is optional for some providers
- oauth2Scopes, the oauth2 scopes.
- oauth2CallbackPath, the path for the callback to the proxy. Defaults to '/callback',
- oauth2CallbackType, the way the sesion info is communicated back to the client. Can be set to 'cookie' or 'query'. Defaults to 'cookie',
- oauth2LogoutPath, get requests to this url will causes the session to be closed. Defaults to '/logout',
- oauth2LoginPath, a url for triggering a new login flow. Defaults to '/login',
- oauth2ServerTokenPath, the path to the token endpoint on the oauth2 server. Defaults to '/oauth/token',
- oauth2ServerAuthorizePath, the path for the authorize endpoint on the oauth2 server. Defaults to ''.
- oauth2ServerLogoutPath, some oauth servers such as auth0 keeps the user logged in using a cookie. By specifying the path the browser will be bounced on the logout endpoint on the oauth provider.

An example of the configuration for the oauth2 handler with auth0:

```
config = [{
    handlerName: 'oauth2',
    path: '/.*',
    options: {
      oauth2ClientId: <OAUTH2_CLIENT_ID>,
      oauth2ClientSecret: <OAUTH2_CLIENT_SECRET>,
      oauth2AuthDomain: 'https://<auth0-domain>.<auth0-region>.auth0.com,
      oauth2CallbackPath: '/callback', // default value
      oauth2CallbackType: 'cookie', // default value
      oauth2LogoutPath: '/logout', // default value
      oauth2Scopes: ['openid', 'email', 'profile', 'offline_access'],
      oauth2ServerLogoutPath: '/v2/logout',
      kvAccountId: <KV_ACCOUNT_ID>,
      kvNamespace: <KV_NAMESPACE>
      kvAuthEmail: <KV_AUTH_EMAIL>,
      kvAuthKey: <KV_AUTH_KEY>
    },
}];
```

An example of the configuration for the oauth2 handler with patreon:

```
config = [  {
    handlerName: 'oauth2',
    path: '/.*',
    options: {
      oauthClientId: <OAUTH2_CLIENT_ID>,
      oauth2ClientSecret: <OAUTH2_CLIENT_SECRET>,
      oauth2AuthDomain: 'https://www.patreon.com,
      oauth2CallbackPath: '/callback', // default value
      oauth2CallbackType: 'cookie', // default value
      oauth2LogoutPath: '/logout', // default value
      oauth2ServerAuthorizePath: '/oauth2',
      oauth2ServerTokenPath: '/api/oauth2/token',
      oauth2Scopes: ["identity"],
      kvAccountId: <KV_ACCOUNT_ID>,
      kvNamespace: <KV_NAMESPACE>
      kvAuthEmail: <KV_AUTH_EMAIL>,
      kvAuthKey: <KV_AUTH_KEY>,
    },
}];
```

### JWT

The jwt handler validates any bearer tokens passed in the authencation headers.

The handler base64 decodes the access token and adds it to the context state as a user object.

An example of the configuration for the jwt handler:

```
config = [  {
    handlerName: 'jwt',
    path: '/.*',
    options: {
        jwksUri: <url>,
        allowPublicAccess: false, // defaults to false
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
    handlerName: 'apikeys',
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
    handlerName: 'apikeysApi',
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
    handlerName: 'split',
    options: {
        host: 'test.example.com',
    },
}];
```

### Response

Returns a static response to the request.

The response handler is configured using a options object that contains the status, body and headers of the response. The body could either be a string or an object.

An example of configuration for a response handler:

```
const rules = [
  {
    handlerName: "response",
    options: {
      body: "Hello world",
      status: 200,
      headers: {
          'Content-Type': 'text/html'
      }
    }
  }
];
```

### Kv-Storage

The kv-storage handler serves static pages straight from kv-storage.
The kvKey property specifies which key is used to fetch the data from the key value store. It supports template variables which makes it possible to serve a complete static site with a single rule.

There is a sample script in the script folder to push files to KV-storage.

An example of configuration for a kv-storage handler:

```
const rules = [
  {
    handlerName: "kvStorage",
    path: /kvStorage/:file*
    options: {
    kvAccountId: <KV_ACCOUNT_ID>,
      kvNamespace: <KV_NAMESPACE>
      kvAuthEmail: <KV_AUTH_EMAIL>,
      kvAuthKey: <KV_AUTH_KEY>,
      kvKey: 'templates/{file}',
      defaultExtention: '.html',  // The default value. Appends .html if no extention is specified on the file
    }
  }
];
```

### CORS

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

### Geo-decorator

Adds a `proxy-continent` header to the request that can be used to route traffic from differnt continent differenty. The followin continents are available:

- AF, africa
- AN, antarctica
- AS, asia
- EU, europe
- NA, north america
- OC, oceania
- SA, south america

An example of the configuration for geo decoration handler in combinatin with a response handler targeting Europe:

```
config = [{
    handlerName: 'geoDecorator',
    path: '/geo',
    options: {},
},
{
    handlerName: 'response',
    path: '/geo',
    headers: {
      'proxy-continent': 'EU',
    },
    options: {
      body: 'This is served to clients in EU',
    },
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

Requests made by the loadbalancer handler would not be cached when using standard fetch-calls as the source isn't proxied by cloudflare. Instead the handler uses the cache-api to manually store the response in the cloudflare cache. The responses are cached according to the cache-headers. If the ´cacheOverride`-option is added to the loadbalancer it will bypass the cache api and use standard fetch requests.

### Origin

Passes the request to the origin for the cdn. This is typically used as a catch all handler to pass all requests that the worker shouldn't handle to origin.

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

### Lambda

Invoke a AWS lambda using http without the AWS api gateway. The API Gateway from AWS is rather expensive for high load scenarios and using workers as a gateway is almost 10 times cheaper and much more flexible.

An example of the configuration for the lambda handler:

```
config = [{
    handlerName: 'lambda',
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
    handlerName: 'tranform',
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

## Custom handlers

It's possible to register custom handlers with new handler names or overriding default handlers by passing an object containing the handlers as second paramter of the proxy constructor:

```
const proxy = new Proxy(rules, {
  custom: (options) => {
    return async (ctx) => {
      ctx.status = 200;
      ctx.body = 'Custom handler';
    };
  },
});
```

## Security

The handlers for oauth2 stores the encrypted tokens (AES-GCM) in KV-Storage. The key for the encryption is stored in the cookie so that both access to the storage and the cookie is needed to get any tokens.

The tokens entries have a ttl of one month by default, so any token that hasn't been accessed in a month will automatically be removed.

## Examples

For more examples of usage see the example folder which contains a complete solution deployed using serverless
