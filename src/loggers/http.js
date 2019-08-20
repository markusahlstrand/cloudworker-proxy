const Chunker = require('./chunker');
const flatten = require('./flatten');

module.exports = class HttpLogger {
  constructor(options) {
    this.url = options.url;
    this.contentType = options.contentType;
    this.delimiter = options.delimiter;
    this.chunker = new Chunker(Object.assign({}, options, { sink: this.sendMessage.bind(this) }));
  }

  async log(message) {
    const flatMessage = flatten(message, this.delimiter);

    await this.chunker.push(JSON.stringify(flatMessage));
  }

  async sendMessage(data) {
    // eslint-disable-next-line no-undef
    return fetch(this.url, {
      body: data,
      method: 'POST',
      headers: {
        'Content-Type': this.contentType,
      },
    });
  }
};
