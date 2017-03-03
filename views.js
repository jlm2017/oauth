

exports.mailForm = function renderForm(res, params) {
  res.render('form', params);
};

exports.mailError = function(res, err) {
  res.render('mail_error', {err});
};

exports.linkError = function(res) {
  res.render('link_error');
};

exports.authenticationSuccess = function(res) {
  res.render('authentication_success');
};