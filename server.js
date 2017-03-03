const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const session = require('express-session');
const redis = require('redis');
const RedisStore = require('connect-redis')(session);
const Promise = require('bluebird');
const expressBunyanLogger = require('express-bunyan-logger');
const passport = require('passport');
const BearerStrategy = require('passport-http-bearer');

const get_template = require('./get_template');
const mailTransport = require('./mail_transport');
const tokens = require('./tokens');

const {
  SECRET,
  PORT,
  ENDPOINT,
  SMTP_URL,
  MAIL_TEMPLATE,
  MAIL_FROM,
  MAIL_SUBJECT,
  API_ENDPOINT,
  API_KEY
} = process.env;

// Promisify redis!
Promise.promisifyAll(redis.RedisClient.prototype);
Promise.promisifyAll(redis.Multi.prototype);

const models = require('./models')(API_ENDPOINT, API_KEY);
const controllers = require('./controllers');
const messageCreator = require('./messageCreator')({
  endpoint: ENDPOINT,
  templateUrl: MAIL_TEMPLATE,
  subject: MAIL_SUBJECT,
  from: MAIL_FROM
});


const redisClient = redis.createClient();
const app = express();

const {verifySMTP, sendMail} = mailTransport(SMTP_URL);
const {MailToken} = tokens(redisClient);

app.use(expressBunyanLogger());
app.use(express.static('public'));
app.use(cookieParser(SECRET));
app.use(bodyParser.urlencoded());
app.use(session({
  store: new RedisStore({client: redisClient}),
  secret: SECRET,
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

app.set('views', 'templates');
app.set('view engine', 'pug');

passport.use(new BearerStrategy(
  function (token, cb) {
    MailToken.findAndDelete(token)
      .then(function (mailToken) {
        if (mailToken === null) { return cb(null, false); }
        return cb(null, mailToken.userId, {oauthParams: mailToken.oauthParams});
      })
      .catch((err) => {
        cb(err);
      });
  }
));

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

app.route('/email')
  .get(controllers.showForm())
  .post(controllers.validateForm({Token: MailToken, User: models.User, messageCreator, sendMail}));

app.get('/email_envoye', function (req, res) {
  res.render('mail_sent');
});

app.get('/connexion',
  passport.authenticate('bearer', {failureRedirect: '/lien_incorrect'}),
  controllers.handleConnection()
);

app.get('/lien_incorrect', controllers.badLink());

verifySMTP().then(function (verified) {
  if (verified) {
    app.listen(PORT);
  }
});
