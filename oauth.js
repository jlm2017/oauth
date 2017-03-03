
exports.getOauthParams = function getOauthParams(...objects) {
  const paramList = ['client_id', 'redirect_uri', 'response_type', 'state', 'scope'];
  const base = Object.assign.apply(null, [{}, ...objects]);

  const extracted = Object.keys(base)
    .filter((key) => paramList.includes(key))
    .reduce((obj, key) => {
      obj[key] = base[key];
      return obj;
    }, {});

  return paramList.every((param) => param in extracted) ? extracted : null;
};

exports.validateOauthParams = function validateOauthParams(oauthParams) {
  return true;
};
