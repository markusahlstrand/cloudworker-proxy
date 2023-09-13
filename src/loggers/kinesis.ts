import { AwsClient } from 'aws4fetch';
import Chunker from './chunker';
import flatten from './flatten';

export default class KinesisLogger {
  constructor(options) {
    this.delimiter = options.delimiter;
    this.chunker = new Chunker({ sink: this.sendMessage.bind(this), ...options });
    this.awsClient = new AwsClient({
      accessKeyId: options.accessKeyId,
      secretAccessKey: options.secretAccessKey,
      region: options.region,
    });
    this.streamName = options.streamName;
    this.region = options.region;
  }

  async log(message) {
    const flatMessage = flatten(message, this.delimiter);

    await this.chunker.push(JSON.stringify(flatMessage));
  }

  async sendMessage(message) {
    const data = btoa(`${JSON.stringify(message)}\n`);
    const body = JSON.stringify({
      DeliveryStreamName: this.streamName,
      Record: {
        Data: data,
      },
    });

    const url = `https://firehose.${this.region}.amazonaws.com`;
    const request = new Request(url, {
      method: 'POST',
      body,
      headers: {
        'X-Amz-Target': 'Firehose_20150804.PutRecord',
        'Content-Type': ' application/x-amz-json-1.1',
      },
    });

    return this.awsClient.fetch(request);
  }
}
