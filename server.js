const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const winston = require('winston');
const morgan = require('morgan');
const passport = require('passport');

winston.configure({
  transports: [
    new (winston.transports.Console)({
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      json: process.env.NODE_ENV === 'production',
      stringify: process.env.NODE_ENV === 'production',
      handleExceptions: true,
      humanReadableUnhandledException: true
    }),
  ]
});

const stream = {
  write: function(msg) {
    winston.info(msg.trim());
  }
};

const knownEmailsMiddleware = require('./io/know-emails');

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

// configure req/res logging
if (process.env.NODE_ENV !== 'production') app.use(morgan('short', {stream}));

app.use(express.static('public'));
app.use(cookieParser(config.cookieSecret));
app.use(knownEmailsMiddleware({secure: process.env.NODE_ENV === 'production'}));
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

/**
 * Error handler
 */
app.use(function(err, req, res, next) {
  if (err.status && err.status !== 500) {
    return res.status(err.status).end();
  }

  winston.error('Unexpected error', err);
  res.status(500).send('Erreur inattendue');
});

// verify connection to SMTP server and start listening
verifySMTP().then(function (verified) {
  if (verified) {
    app.listen(config.port);
  }
});
