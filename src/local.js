const ncw = require("node-cloudworker");
const Proxy = require("./index");

ncw.applyShims();

const rules = {
  rules: [
    {
      handler: "static",
      data: {
        body: "Hello world"
      }
    }
  ]
};
const proxy = new Proxy(rules);

ncw.start(async event => {
  return await proxy.resolve(event);
});
