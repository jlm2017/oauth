const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const expressBunyanLogger = require('express-bunyan-logger');
const passport = require('passport');

const {verifySMTP} = require('./io/mail_transport');
const redisClient = require('./io/redis_client');

const router = require('./router');

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

// configure logging
app.use(expressBunyanLogger());

app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended: false}));
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

app.use('/', router);

// verify connection to SMTP server and start listening
verifySMTP().then(function (verified) {
  if (verified) {
    app.listen(config.port);
  }
});
