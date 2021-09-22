import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import type SessionService from 'oncore/services/session';
import type RouterService from '@ember/routing/router-service';
import debugLogger from 'ember-debug-logger';
import config from 'oncore/config/environment';

const debug = debugLogger('route:login');

class LoginRoute extends Route {
  @service
  public session!: SessionService;

  @service
  public router!: RouterService;

  public beforeModel(): void {
    const { session, router } = this;
    const identity = session.currentSession.getOrElse(undefined);

    if (identity !== undefined) {
      debug('login unnecessary, user present, redirecting to home');
      router.transitionTo('home');
      return;
    }

    debug('login route, rendering link - "%s"', config.externalRoutes.auth.start);
  }
}

export default LoginRoute;
