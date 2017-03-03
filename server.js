const express = require('express');
const cookieParser = require('cookie-parser');
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

const app = express();

app.use(expressBunyanLogger());
app.use(express.static('public'));
app.use(cookieParser(config.secret));
app.use(bodyParser.urlencoded());
app.use(session({
  store: new RedisStore({client: redisClient}),
  secret: config.secret,
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

require('./auth');

app.set('views', 'templates');
app.set('view engine', 'pug');

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

app.get('/',
  ensureLoggedIn('/email'),
  function (req, res) {
    res.send('OK!');
  }
);

app.get('/autoriser', oauthServer.authorize);
app.post('/autoriser/decision', oauthServer.decision);

app.post('/token', oauthServer.token);

verifySMTP().then(function (verified) {
  if (verified) {
    app.listen(config.port);
  }
});
