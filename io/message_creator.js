const request = require('superagent');
const VError = require('verror');
const querystring = require('querystring');
const moment = require('moment');
require('moment-timezone');

const config = require('../config');
moment.locale('fr');

function splitCode(code) {
  return code.match(/.{1,4}/g).join(' ');
}

function get_template(url, query_parameters) {
  return request
    .get(url)
    .query(query_parameters)
    .catch(function(err) {
      throw new VError(err, 'Could not fetch mail template "%s"', url);
    });
}

module.exports = function messageCreator(email, code, expiryTime) {
  const formattedExpiryTime = moment(expiryTime).tz('Europe/Paris').format('LT');

  const bindings = {
    EMAIL: email,
    CODE: splitCode(code),
    EXPIRY_TIME: formattedExpiryTime,
  };

  bindings['LINK_BROWSER'] = `${config.templateUrl}?${querystring.stringify(bindings)}`;

  return get_template(config.templateUrl, bindings)
    .then(function (res) {
      return {
        from: config.mail_from,
        to: email,
        subject: config.mail_subject,
        html: res.text,
      };
    });
};
