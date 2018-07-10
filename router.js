const express = require('express');
const cors = require('cors');
const passport = require('passport');

const router = express.Router();

const pages = require('./controllers/pages');
const auth = require('./auth');
const oauthServer = require('./controllers/oauth_server');

// root route
router.get('/', pages.root);

// mail routes
router.route('/email')
  .get(pages.showForm)
  .post(pages.validateForm);
router.get('/oublier_emails', pages.forgetKnownEmails);
router.get('/email_envoye', pages.emailSent);

// authentication routes
router.post('/connexion', auth.codeConnect);
router.get('/deconnexion', auth.disconnect);
router.get('/succes', pages.authenticationSuccess);
router.get('/lien_incorrect', pages.badLink);
router.get('/code_incorrect', pages.badCode);

/*
 * OAUTH2 routes
 * =============
 */

// Authorization code endpoint
router.get('/autoriser', oauthServer.authorize);
// Token exchange endpoint
router.options('/token', cors());
router.post('/token',
  passport.authenticate(['client_basic', 'client_body'], {session: false}),
  cors((req, cb) => {
    return cb(null, {
      origin: (req.user.uris.filter(uri => uri.includes(req.header('Origin'))).length > 0)
    });
  }),
  oauthServer.token
);

// Interaction form handling
router.post('/autoriser/decision', oauthServer.decision);

module.exports = router;
