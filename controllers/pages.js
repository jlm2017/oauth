const {ensureLoggedIn} = require('connect-ensure-login');
const uuid = require('uuid/v4');

const User = require('../models/people');
const {LoginCode} = require('../models/tokens');
const {sendMail} = require('../io/mail_transport');
const messageCreator = require('../io/message_creator');

const {TokenBucket} = require('../models/token_bucket');
const loginTokenBucket = new TokenBucket({name:'sendMail', max: 3, interval: 600});


exports.showForm = function showForm(req, res) {
  res.render('email_form', {
    action: 'email',
    previousEmail: '',
  });
};

exports.validateForm = async function validateForm(req, res, next) {
  const {email} = req.body;

  if (!email) {
    res.render('email_form', {
      action: 'email',
      error: 'Le champ email est requis.'
    });
  }

  try {
    const user = await User.findByEmail(email);

    if (user === null) {
      res.render('email_form', {
        action: 'email',
        error: 'Votre adresse email n\'est pas trouvée. Etes vous bien signataire ?'
      });
    }

    req.session.userId = user._id;
    req.session.csrf = uuid();

    const allowedToSend = await loginTokenBucket.checkIfAllowed(user._id);

    if (!allowedToSend) {
      return res.render('mail_rate_limited', {
        userId: req.session.userId,
        csrf: req.session.csrf
      });
    }

    const {code, expiration} = await LoginCode.getNewCode(user._id);

    const mail = await messageCreator(email, code, expiration);
    await sendMail(mail);
    res.redirect(302, '/email_envoye');

  } catch (err) {
    next(err);
  }
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
