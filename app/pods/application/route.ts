import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import Session from 'oncore/services/session';
import debugLogger from 'ember-debug-logger';

const debug = debugLogger('route:application');

class ApplicationRoute extends Route {
  @service
  public session!: Session;

  public async model(): Promise<void> {
    debug('application route loading');
    const identity = await this.session.identify();
    debug('loaded identity payload "%j"', identity);
  }
}

export default ApplicationRoute;
