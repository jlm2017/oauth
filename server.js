const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const expressBunyanLogger = require('express-bunyan-logger');
const passport = require('passport');
const {ensureLoggedIn} = require('connect-ensure-login');

const controllers = require('./controllers');
const {verifySMTP} = require('./io/mail_transport');

const redisClient = require('./io/redis_client');
const oauthServer = require('./oauth_server');

const config = require('./config');

const sessionStore = new RedisStore({
  client: redisClient,
  ttl: config.sessionDuration,
  prefix: config.sessionPrefix
});

const app = express();

app.set('views', 'templates');
app.set('view engine', 'pug');
app.set('trust proxy', config.trustProxy);

app.use(expressBunyanLogger());
app.use(express.static('public'));
app.use(bodyParser.urlencoded());
app.use(session({
  store: sessionStore,
  secret: config.cookieSecret,
  name: config.cookieName,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: config.cookieMaxAge,
    domain: config.cookieDomain,
    secure: config.cookieSecure,
  }
}));

app.use(passport.initialize());
app.use(passport.session());

require('./auth');

app.route('/email')
  .get(controllers.showForm)
  .post(controllers.validateForm);

app.get('/email_envoye', controllers.emailSent);

app.get('/connexion',
  passport.authenticate('mail_auth', {successReturnToOrRedirect: '/succes', failureRedirect: '/lien_incorrect'})
);

app.get('/deconnexion', function (req, res) {
  req.logout();
  res.redirect('/email');
});

app.get('/succes', controllers.authenticationSuccess);

app.get('/lien_incorrect', controllers.badLink);

app.get('/', controllers.root);

app.get('/autoriser', oauthServer.authorize);
app.post('/autoriser/decision', oauthServer.decision);

app.post('/token', oauthServer.token);

app.get('/voir_profil', controllers.viewProfile)

verifySMTP().then(function (verified) {
  if (verified) {
    app.listen(config.port);
  }
});
