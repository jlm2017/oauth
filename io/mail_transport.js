const nodemailer = require('nodemailer');
const Promise = require('bluebird');
const htmlToText = require('nodemailer-html-to-text').htmlToText;

const config = require('../config');

const mailTransporter = nodemailer.createTransport(config.smtp_url);

mailTransporter.use('compile', htmlToText({
  hideLinkHrefIfSameAsText: true
}));

exports.verifySMTP = config.use_sendmail ?
  async () => true
  : mailTransporter.verify.bind(mailTransporter);
exports.sendMail = Promise.promisify(mailTransporter.sendMail, {context: mailTransporter});
