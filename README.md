# cloudworker-proxy
An api gateway for cloudflare workers with configurable handlers for:
* Routing
    * Load balancing of http endpoints
    * Invoking AWS lambdas and google cloud functions
    * Static responses
* Logging (http, kinesis)
* Authentication (basic, oauth2)
* Rate limiting
* Rewrite
    * Headers

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

### Static

Returns a static response to the request.

An example of configuration for a static handler:
```
const rules = [  
  {
    handlerName: "static",
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



## Examples

For more examples of usage see the example folder which contains a complete solution deployed using serverless