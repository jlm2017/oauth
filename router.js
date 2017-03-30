const express = require('express');
const passport = require('passport');

router = express.Router();

const controllers = require('./controllers');
const auth = require('./auth');
const oauthServer = require('./oauth_server');

// root route
router.get('/', controllers.root);

// mail routes
router.route('/email')
  .get(controllers.showForm)
  .post(controllers.validateForm);
router.get('/email_envoye', controllers.emailSent);

// authentication routes
router.get('/connexion', auth.connect);
router.get('/deconnexion', auth.disconnect);
router.get('/succes', controllers.authenticationSuccess);
router.get('/lien_incorrect', controllers.badLink);

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

// Basic route to access profile
router.get('/voir_profil', controllers.viewProfile);

module.exports = router;
