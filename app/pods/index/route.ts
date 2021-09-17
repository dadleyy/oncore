import Route from '@ember/routing/route';
import Session from 'oncore/services/session';
import { inject as service } from '@ember/service';
import debugLogger from 'ember-debug-logger';

const debug = debugLogger('route:index');

class ApplicationIndexRoute extends Route {
  @service
  public session!: Session;

  public beforeModel(): unknown {
    const { session } = this;
    const current = session.currentSession.getOrElse(undefined);
    debug('before on the application index, "%j"', current);
    return current ? this.transitionTo('home') : this.transitionTo('login');
  }
}

export default ApplicationIndexRoute;
