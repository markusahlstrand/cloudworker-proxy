import Chunker from './chunker';
import flatten from './flatten';

export default class HttpLogger {
  constructor(options) {
    this.url = options.url;
    this.contentType = options.contentType;
    this.delimiter = options.delimiter;
    this.chunker = new Chunker({ sink: this.sendMessage.bind(this), ...options });
  }

  async log(message) {
    const flatMessage = flatten(message, this.delimiter);

    await this.chunker.push(JSON.stringify(flatMessage));
  }

  async sendMessage(data) {
    return fetch(this.url, {
      body: data,
      method: 'POST',
      headers: {
        'Content-Type': this.contentType,
      },
    });
  }
}
