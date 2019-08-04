const ncw = require('node-cloudworker');

ncw.applyShims();


const Proxy = require('../src');

const config = {

};

const proxy = new Proxy(config);

ncw.start(async (event) => {
    return await proxy.resolve(event);
});