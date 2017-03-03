const rp = require('request-promise');
const qs = require('qs');
const VError = require('verror');

module.exports = function get_template(url, query_parameters) {
  return rp.get(`${url}?${qs.stringify(query_parameters)}`)
    .catch(function (err) {
      throw new VError(err, 'Could not fetch mail template "%s"', url);
    });
};
