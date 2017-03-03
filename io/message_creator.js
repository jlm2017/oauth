const rp = require('request-promise');
const qs = require('qs');
const VError = require('verror');

const config = require('../config');

function get_template(url, query_parameters) {
  return rp.get(`${url}?${qs.stringify(query_parameters)}`)
    .catch(function (err) {
      throw new VError(err, 'Could not fetch mail template "%s"', url);
    });
}

module.exports = function messageCreator(email, token) {
  const redirect_link = `${config.endpoint}/connexion?access_token=${token}`;
  return get_template(config.templateUrl, {
    EMAIL: email,
    REDIRECT_LINK: redirect_link,
    TITLE: config.mail_subject
  })
    .then(function (html) {
      return {
        from: config.mail_from,
        to: email,
        subject: config.mail_subject,
        html: html
      };
    });
};
