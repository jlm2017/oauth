const qs = require('qs');

const views = require('./views');
const oauth = require('./oauth');

const {getOauthParams} = oauth;
const {mailForm} = views;

exports.showForm = () => function showForm(req, res) {
  const oauthParams = getOauthParams(req.query);

  views.mailForm(res, {
    action: 'email',
    previousEmail: '',
    hidden: oauthParams,
  });
};

exports.validateForm = function({Token, User, messageCreator, sendMail}) {
  return function validateForm(req, res) {
    const {email} = req.body;
    const oauthParams = getOauthParams(req.query, req.body);

    return User.findByEmail(email)
      .then((user) => {
        if (user === null) {
          mailForm(res, {
            action: 'email',
            hidden: oauthParams,
            error: 'Votre adresse email n\'est pas trouvée. Etes vous bien signataire ?'
          });
        }
        else {
          const token = new Token(email, oauthParams);
          return token.save()
            .then((tok) => messageCreator(email, tok))
            .then(sendMail)
            .then(() => {
              res.redirect('/email_envoye', 302);
            })
            .catch((err) => {
              req.log.error('Error when handling', {err});
              views.mailError(res, err);
            });
        }
      });
  };
};

exports.handleConnection = () => function handleConnection(req, res) {
  if (req.authInfo.oauthParams !== null) {
    res.redirect(`/autoriser?${qs.stringify(req.authInfo.oauthParams)}`);
  } else {
    views.authenticationSuccess(res);
  }
};

exports.badLink = () => function badLink(req, res) {
  views.linkError(res);
};

