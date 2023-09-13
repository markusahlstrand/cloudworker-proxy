import lodashGet from 'lodash.get';

const _ = {
  get: lodashGet,
};

/**
 * This replaces the in-worker api calls for kv-storage with rest-api calls.
 */

export default class KvStorage {
  accountId: string;

  namespace: string;

  authEmail: string;

  authKey: string;

  ttl: number;

  constructor({
    accountId,
    namespace,
    authEmail,
    authKey,
    ttl,
  }: {
    accountId: string;
    namespace: string;
    authEmail: string;
    authKey: string;
    ttl: number;
  }) {
    this.accountId = accountId;
    this.namespace = namespace;
    this.authEmail = authEmail;
    this.authKey = authKey;
    this.ttl = ttl;
  }

  getNamespaceUrl() {
    return new URL(
      `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/storage/kv/namespaces/${this.namespace}`,
    );
  }

  getUrlForKey(key) {
    return new URL(`${this.getNamespaceUrl()}/values/${key}`);
  }

  async list(prefix, limit = 10) {
    const url = `${this.getNamespaceUrl()}/keys?prefix=${prefix}&limit=${limit}`;

    const response = await fetch(url, {
      headers: {
        'X-Auth-Email': this.authEmail,
        'X-Auth-Key': this.authKey,
      },
    });

    if (response.ok) {
      return response.json();
    }
    return null;
  }

  async get(key, type?: string) {
    const url = this.getUrlForKey(key);

    const response = await fetch(url, {
      headers: {
        'X-Auth-Email': this.authEmail,
        'X-Auth-Key': this.authKey,
      },
    });

    if (response.ok) {
      switch (type) {
        case 'json':
          return response.json();
        case 'stream':
          return response;
        case 'arrayBuffer':
          return response.arrayBuffer();
        default:
          return response.text();
      }
    }

    return null;
  }

  async getWithMetadata(key, type) {
    const [value, keys] = await Promise.all([this.get(key, type), this.list(key)]);

    const metadata = _.get(keys, 'result.0.metadata', {});
    return {
      value,
      metadata,
    };
  }

  async put(key, value, metadata = {}) {
    const url = this.getUrlForKey(key);
    const searchParams = new URLSearchParams();

    if (this.ttl) {
      searchParams.append('expiration_ttl', this.ttl.toString());
    }

    const headers = {
      'X-Auth-Email': this.authEmail,
      'X-Auth-Key': this.authKey,
    };

    url.search = searchParams.toString();

    const formData = new FormData();
    formData.append('value', value);
    formData.append('metadata', JSON.stringify(metadata));

    const response = await fetch(url.toString(), {
      method: 'PUT',
      headers,
      body: value,
    });

    return response.ok;
  }

  async delete(key) {
    const url = this.getUrlForKey(key);

    return fetch(url, {
      method: 'DELETE',
      headers: {
        'X-Auth-Email': this.authEmail,
        'X-Auth-Key': this.authKey,
      },
    });
  }
}
