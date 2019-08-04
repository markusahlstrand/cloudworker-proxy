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
