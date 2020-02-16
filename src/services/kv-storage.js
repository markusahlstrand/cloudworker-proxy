module.exports = class KvStorage {
  constructor({ accountId, namespace, authEmail, authKey, ttl = 60 }) {
    this.accountId = accountId;
    this.namespace = namespace;
    this.authEmail = authEmail;
    this.authKey = authKey;
    this.ttl = ttl;
  }

  getUrlForKey(key) {
    return `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/storage/kv/namespaces/${this.namespace}/values/${key}`;
  }

  async get(key) {
    const url = this.getUrlForKey(key);

    // eslint-disable-next-line no-undef
    const response = await fetch(url, {
      headers: {
        'X-Auth-Email': this.authEmail,
        'X-Auth-Key': this.authKey,
      },
    });

    if (response.ok) {
      return response.text();
    }

    return null;
  }

  async put(key, value) {
    const url = this.getUrlForKey(key);
    const ttlQueryString = this.ttl ? `?expiration_ttl=${this.ttl}` : '';

    // eslint-disable-next-line no-undef
    const response = await fetch(url + ttlQueryString, {
      method: 'PUT',
      headers: {
        'X-Auth-Email': this.authEmail,
        'X-Auth-Key': this.authKey,
      },
      body: value,
    });

    return response.ok;
  }

  async remove(key) {
    const url = this.getUrlForKey(key);

    // eslint-disable-next-line no-undef
    return fetch(url, {
      method: 'DELETE',
      headers: {
        'X-Auth-Email': this.authEmail,
        'X-Auth-Key': this.authKey,
      },
    });
  }
};
