import EmberRouter from '@ember/routing/router';
import config from 'oncore/config/environment';

export default class Router extends EmberRouter {
  location = config.locationType;
  rootURL = config.rootURL;
}

Router.map(function () {
  this.route('login');
  this.route('home');
  this.route('tables', function() {
    this.route('single-table', { path: '/:table' });
  });

  this.route('not-found', { path: '*' });
});
