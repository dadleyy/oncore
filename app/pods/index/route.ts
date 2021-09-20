import Route from '@ember/routing/route';
import Session from 'oncore/services/session';
import type RouterService from '@ember/routing/router-service';
import { inject as service } from '@ember/service';
import debugLogger from 'ember-debug-logger';

const debug = debugLogger('route:index');

class ApplicationIndexRoute extends Route {
  @service
  public declare session: Session;

  @service
  public declare router: RouterService;

  public beforeModel(): unknown {
    const { session, router } = this;
    const current = session.currentSession.getOrElse(undefined);
    debug('before on the application index, "%j"', current);
    return current ? router.transitionTo('home') : router.transitionTo('login');
  }
}

export default ApplicationIndexRoute;
