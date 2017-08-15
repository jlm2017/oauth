const {ensureLoggedIn} = require('connect-ensure-login');

const User = require('../models/people');
const {MailToken} = require('../models/tokens');
const {sendMail} = require('../io/mail_transport');
const messageCreator = require('../io/message_creator');

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
        return token.save()
          .then((tok) => messageCreator(email, tok))
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
  res.render('email_sent');
};

exports.authenticationSuccess = function authenticationSuccess(req, res) {
  res.render('authentication_success');
};

exports.badLink = function badLink(req, res) {
  res.render('link_error');
};

exports.root = [
  ensureLoggedIn('/email'),
  function (req, res) {
    res.render('root', {email: req.user.email});
  }
];