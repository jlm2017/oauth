const config = {};

config.secret = process.env.SECRET;
config.port = process.env.port || 4002;
config.endpoint = process.env.ENDPOINT;

config.smtp_url = process.env.SMTP_URL;
config.templateUrl = process.env.MAIL_TEMPLATE;
config.mail_from = process.env.MAIL_FROM;
config.mail_subject = process.env.MAIL_SUBJECT;

config.api_endpoint = process.env.API_ENDPOINT;
config.api_key = process.env.API_KEY;

module.exports = config;
