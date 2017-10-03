const crypto = require('crypto');
const {ensureLoggedIn} = require('connect-ensure-login');
const {promisify} = require('util');
const uuid = require('uuid/v4');

const User = require('../models/people');
const {MailToken} = require('../models/tokens');
const {sendMail} = require('../io/mail_transport');
const messageCreator = require('../io/message_creator');

async function randomDigitCode(length) {
  var code = '';

  for (var i = 0; i < length; i++) {
    let buf = await promisify(crypto.randomBytes)(4);
    code += (buf.readUInt32BE(0) % 10).toString();
  }

  return code;
}

exports.showForm = function showForm(req, res) {
  res.render('email_form', {
    action: 'email',
    previousEmail: '',
  });
};

exports.validateForm = function validateForm(req, res, next) {
  const {email} = req.body;

  return User.findByEmail(email)
    .then((user) => {
      if (user === null) {
        res.render('email_form', {
          action: 'email',
          error: 'Votre adresse email n\'est pas trouvée. Etes vous bien signataire ?'
        });
      }
      else {
        const token = new MailToken(user._id);
        randomDigitCode(8).then((code) => {
          req.session.code = code;
          req.session.userId = user._id;
          req.session.csrf = uuid();
          req.session.codeExpiration = new Date(new Date().getTime() + 1000 * 60 * 10);

          return Promise.all([token.save(), code]);
        })
          .then(([tok, code]) => messageCreator(email, tok, code))
          .then(sendMail)
          .then(() => {
            res.redirect(302, '/email_envoye');
          });
      }
    })
    .catch((err) => {
      next(err);
    });
};

exports.emailSent = function emailSent(req, res) {
  res.render('email_sent', {
    userId: req.session.userId,
    csrf: req.session.csrf
  });
};

exports.authenticationSuccess = function authenticationSuccess(req, res) {
  res.render('authentication_success');
};

exports.badLink = function badLink(req, res) {
  res.render('link_error');
};

exports.badCode = function badCode(req, res) {
  res.render('code_error');
};

exports.root = [
  ensureLoggedIn('/email'),
  function (req, res) {
    res.render('root', {email: req.user.email});
  }
];
