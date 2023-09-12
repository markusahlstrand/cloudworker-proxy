function resolveParams(url, params = {}) {
  return Object.keys(params).reduce((acc, key) => acc.replace(`{${key}}`, params[key]), url);
}

function instanceToJson(instance) {
  return [...instance].reduce((obj, item) => {
    const prop = {};
    // eslint-disable-next-line prefer-destructuring
    prop[item[0]] = item[1];
    return { ...obj, ...prop };
  }, {});
}

module.exports = {
  instanceToJson,
  resolveParams,
};
