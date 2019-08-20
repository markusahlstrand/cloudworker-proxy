module.exports = function flatten(obj, delimiter = '.', path = '') {
  if (!(obj instanceof Object)) {
    // Remove the last delimiter
    if (path.endsWith(delimiter)) {
      return { [path.slice(0, path.length - 1)]: obj };
    }
    return { [path]: obj };
  }

  return Object.keys(obj).reduce((output, key) => {
    if (obj[key] == null) {
      return output;
    }

    return { ...output, ...flatten(obj[key], delimiter, path + key + delimiter) };
  }, {});
};
