const COOKIE_NAME = 'knownEmails';

function knownEmailsMiddleware(options) {
  const opts = options || {};
  const secure = typeof options.secure === 'undefined' ? true : options.secure;

  return function knownEmailsMiddleware(req, res, next) {
    const rawCookie = req.cookies[COOKIE_NAME].trim();
    const domain = req.headers.host.split(':')[0].split('.').slice(-2).join(',');

    let knownEmails = rawCookie ? rawCookie.split(',') : [];
    req.knownEmails = knownEmails.slice();
    req.addKnownEmail = function (email) {

      const index = knownEmails.indexOf(email);

      if (index === -1) {
        knownEmails = [email].concat(knownEmails.slice(0, 3));
      } else {
        knownEmails = [email].concat(knownEmails.slice(0, index), knownEmails.slice(index + 1));
      }

      res.cookie(COOKIE_NAME, knownEmails.join(','), {domain, secure, maxAge: 365 * 24 * 3600 * 1000})
    };
    req.flushKnownEmails = function () {
      knownEmails = [];
      res.cookie(COOKIE_NAME, '', {domain, secure, maxAge: 1000});
    };

    next();
  };
}

module.exports = knownEmailsMiddleware;
