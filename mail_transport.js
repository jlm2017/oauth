const nodemailer = require('nodemailer');
const Promise = require('bluebird');

module.exports = function mailTransport(smtp_url) {
  const mailTransporter = nodemailer.createTransport(smtp_url);
  return {
    verifySMTP: Promise.promisify(mailTransporter.verify, {context: mailTransporter}),
    sendMail: Promise.promisify(mailTransporter.sendMail, {context: mailTransporter})
  };
};
