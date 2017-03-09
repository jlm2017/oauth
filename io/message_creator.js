const request = require('superagent');
const VError = require('verror');

const config = require('../config');

function get_template(url, query_parameters) {
  return request
    .get(url)
    .query(query_parameters)
    .catch(function(err) {
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
    .then(function (res) {
      return {
        from: config.mail_from,
        to: email,
        subject: config.mail_subject,
        html: res.text
      };
    });
};
