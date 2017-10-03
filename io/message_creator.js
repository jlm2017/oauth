const request = require('superagent');
const VError = require('verror');
const querystring = require('querystring');

const config = require('../config');

function get_template(url, query_parameters) {
  return request
    .get(url)
    .query(query_parameters)
    .catch(function(err) {
      throw new VError(err, 'Could not fetch mail template "%s"', url);
    });
}

module.exports = function messageCreator(email, token, code) {
  const redirect_link = `${config.endpoint}/connexion?access_token=${token}`;

  const bindings = {
    EMAIL: email,
    REDIRECT_LINK: redirect_link,
    TITLE: config.mail_subject,
    CODE: code
  };

  bindings['LINK_BROWSER'] = `${config.templateUrl}?${querystring.stringify(bindings)}`;

  return get_template(config.templateUrl, bindings)
    .then(function (res) {
      return {
        from: config.mail_from,
        to: email,
        subject: config.mail_subject,
        html: res.text
      };
    });
};
