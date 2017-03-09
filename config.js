const yn = require('yn');

const config = {};

function required(name) {
  throw new Error(`Missing required ${name} environment variable.`);
}


// SERVER PARAMETERS
/*
 * The port on which the server will be listening
 *
 * Default : 4002
 */
config.port = process.env.PORT || 4002;
/*
 * Addresses of proxies to trust
 *
 * When enabled, express uses the headers X-Forwarded-Host, X-Forwarded-Proto
 * and X-Forwarded-For to qualify the request.
 *
 * By default, only proxy on loopback addresses are trusted.
 *
 */
if (yn(process.env.TRUST_PROXY) === null)
  config.trustProxy = process.env.TRUST_PROXY || 'loopback';
else {
  config.trustProxy = yn(process.env.TRUST_PROXY);
}


// SESSION PARAMETERS
/*
 * The cookie secret
 *
 * Required environment variable
 */
config.cookieSecret = process.env.COOKIE_SECRET || required('COOKIE_SECRET');
/*
 * The session cookie's name
 */
config.cookieName = process.env.COOKIE_NAME || 'jlmauth.session';
/*
 * The cookie max-age in milliseconds
 *
 * It will be the max duration of the session, as the cookie is no longer
 * modified (and thus reupdated) after the establishment of the session.
 *
 * The default is 365 days
 */
config.cookieMaxAge = +process.env.COOKIE_MAX_AGE || 1000 * 3600 * 24 * 365;
/*
 * The session domain
 */
config.cookieDomain = process.env.SESSION_DOMAIN || null;
/*
 * Whether to set the secure flag on the cookie
 *
 * Secure cookie are only to be sent over HTTPS
 */
config.cookieSecure = yn(process.env.COOKIE_SECURE);
if (config.cookieSecure === null) {
  config.cookieSecure = true;
}
/*
 * The session duration
 *
 * This is the duration for which the session will stay valid between two connections by the user
 * Every time the user displays a page, the session expiration will be reset to this value
 *
 * The default is two weeks
 */
config.sessionDuration = +process.env.SESSION_DURATION || 3600 * 24 * 15;
/*
 * The prefix to use to store session with in Redis
 */
config.sessionPrefix = process.env.SESSION_PREFIX || 'jlmauth';


// EMAIL PARAMETERS
/*
 * The URL with the connection information to the SMTP server
 *
 * Required parameter
 */
config.smtp_url = process.env.SMTP_URL || required('SMTP_URL');
/*
 * The URL to GET the mail template from
 */
config.templateUrl = process.env.MAIL_TEMPLATE || required('MAIL_TEMPLATE');
/*
 * The base URL to which the connection link inserted in the mail
 * must point
 */
config.endpoint = process.env.ENDPOINT || required('ENDPOINT');
/*
 * The address from which the connection mail must be sent
 */
config.mail_from = process.env.MAIL_FROM || required('MAIL_FROM');
/*
 * The subject of the connection mail
 */
config.mail_subject = process.env.MAIL_SUBJECT || 'Connexion';


// API PARAMETERS
/*
 * The endpoint at which the API is found
 */
config.api_endpoint = process.env.API_ENDPOINT || required('API_ENDPOINT');
/*
 * The API Key to use to connect to the API
 */
config.api_key = process.env.API_KEY || required('API_KEY');

module.exports = config;
