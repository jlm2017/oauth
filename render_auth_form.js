const Promise = require('bluebird');

module.exports = function render_auth_form(app) {
  const render = Promise.promisify(app.render, app);

  return render()
    .then();
}