import Route from '@ember/routing/route';
import debugLogger from 'ember-debug-logger';
import type RouterService from '@ember/routing/router-service';
import type SessionService from 'oncore/services/session';
import type Stickbot from 'oncore/services/stickbot';
import { inject as service } from '@ember/service';
import * as State from 'oncore/pods/home/state';
import * as Seidr from 'seidr';

const debug = debugLogger('route:home');

class HomeRoute extends Route {
  @service
  public session!: SessionService;

  @service
  public router!: RouterService;

  @service
  public stickbot!: Stickbot;

  public beforeModel(): void {
    const { router, session } = this;

    if (session.currentSession.getOrElse(undefined) === undefined) {
      debug('home route redirect without user auth');
      router.transitionTo('login');
    }
  }

  public async model(): Promise<Seidr.Result<Error, State.Model>> {
    const { stickbot } = this;
    const tables = await stickbot.tables();
    return tables.map(tables => ({ tables }));
  }
}

export default HomeRoute;
