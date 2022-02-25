import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import * as Seidr from 'seidr';
import Session, { CurrentSession } from 'oncore/services/session';
import config from 'oncore/config/environment';
import debugLogger from 'ember-debug-logger';

const debug = debugLogger('route:application');

class ApplicationRoute extends Route {
  @service
  public session!: Session;

  public async model(): Promise<{ version: string; session: Seidr.Maybe<CurrentSession> }> {
    debug('application route loading');
    const identity = await this.session.identify();
    debug('loaded identity payload "%j"', identity);
    return { version: config.version.slice(0, 7), session: identity };
  }
}

export default ApplicationRoute;
