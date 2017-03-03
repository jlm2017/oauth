const {User} = require('./models/api');
const {MailToken} = require('./models/tokens');
const {sendMail} = require('./io/mail_transport');
const messageCreator = require('./io/message_creator');

exports.showForm = function showForm(req, res) {
  res.render('email_form', {
    action: 'email',
    previousEmail: '',
  });
};

exports.validateForm = function validateForm(req, res) {
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
        const token = new MailToken(user.id);
        return token.save()
          .then((tok) => messageCreator(email, tok))
          .then(sendMail)
          .then(() => {
            res.redirect('/email_envoye', 302);
          })
          .catch((err) => {
            req.log.error('Error when handling', {err});
            res.render('email_error', {err});
          });
      }
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

