const rp = require('request-promise');
const qs = require('qs');
const VError = require('verror');

function get_template(url, query_parameters) {
  return rp.get(`${url}?${qs.stringify(query_parameters)}`)
    .catch(function (err) {
      throw new VError(err, 'Could not fetch mail template "%s"', url);
    });
}

module.exports = function messageCreator({endpoint, templateUrl, subject, from}) {
  return function message(email, token) {
    const redirect_link = `${endpoint}/connexion?access_token=${token}`;
    return get_template(templateUrl, {
      EMAIL: email,
      REDIRECT_LINK: redirect_link,
      TITLE: subject
    })
      .then(function (html) {
        return {
          from: from,
          to: email,
          subject: subject,
          html: html
        };
      });
  };
};
