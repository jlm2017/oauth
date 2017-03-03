const nodemailer = require('nodemailer');
const Promise = require('bluebird');

const config = require('../config');

const mailTransporter = nodemailer.createTransport(config.smtp_url);

exports.verifySMTP = Promise.promisify(mailTransporter.verify, {context: mailTransporter});
exports.sendMail = Promise.promisify(mailTransporter.sendMail, {context: mailTransporter});
