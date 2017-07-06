const express = require('express');

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
router.get('/email_envoye', pages.emailSent);

// authentication routes
router.get('/connexion', auth.connect);
router.get('/deconnexion', auth.disconnect);
router.get('/succes', pages.authenticationSuccess);
router.get('/lien_incorrect', pages.badLink);

/*
 * OAUTH2 routes
 * =============
 */

// Authorization code endpoint
router.get('/autoriser', oauthServer.authorize);
// Token exchange endpoint
router.post('/token', oauthServer.token);

// Interaction form handling
router.post('/autoriser/decision', oauthServer.decision);

module.exports = router;
