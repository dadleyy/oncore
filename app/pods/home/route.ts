import Route from '@ember/routing/route';
import debugLogger from 'ember-debug-logger';
import type RouterService from '@ember/routing/router-service';
import type SessionService from 'oncore/services/session';
import type Stickbot from 'oncore/services/stickbot';
import { inject as service } from '@ember/service';
import * as State from 'oncore/pods/home/state';
import * as Seidr from 'seidr';
import * as helpers from 'oncore/utility/maybe-helpers';

const debug = debugLogger('route:home');

class HomeRoute extends Route {
  @service
  public declare session: SessionService;

  @service
  public declare router: RouterService;

  @service
  public declare stickbot: Stickbot;

  public beforeModel(): void {
    const { router, session } = this;

    if (session.currentSession.getOrElse(undefined) === undefined) {
      debug('home route redirect without user auth');
      router.transitionTo('login');
    }
  }

  public async model(): Promise<Seidr.Result<Error, State.Model>> {
    const { stickbot, session } = this;
    debug('loading tables');
    const tables = await stickbot.tables();
    debug('finished loading tables %o', tables);

    const maybeModel = helpers
      .zip(tables.toMaybe(), session.currentSession)
      .map(([tables, session]) => State.toModel(session, tables));

    return helpers.orErr(new Error('not-found'), maybeModel);
  }
}

export default HomeRoute;
