import Route from '@ember/routing/route';
import debugLogger from 'ember-debug-logger';
import type RouterService from '@ember/routing/router-service';
import type SessionService from 'oncore/services/session';
import type TableIndex from 'oncore/services/stickbot-tables';
import { inject as service } from '@ember/service';
import * as State from 'oncore/pods/home/state';
import Controller from 'oncore/pods/home/controller';
import * as helpers from 'oncore/utility/maybe-helpers';

const debug = debugLogger('route:home');

class HomeRoute extends Route {
  @service
  public declare session: SessionService;

  @service
  public declare router: RouterService;

  @service
  public declare stickbotTables: TableIndex;

  public beforeModel(): void {
    const { router, session } = this;

    if (session.currentSession.getOrElse(undefined) === undefined) {
      debug('home route redirect without user auth');
      router.transitionTo('login');
    }
  }

  public resetController(controller: Controller): void {
    controller.set('jobs', []);
  }

  public async model(): Promise<State.ModelResult> {
    const { stickbotTables: tableIndex, session } = this;
    debug('loading tables');

    const tables = await tableIndex.seek();
    debug('finished loading tables %o', tables);

    const maybeModel = helpers
      .zip(tables.toMaybe(), session.currentSession)
      .map(([tables, session]) => State.toModel(session, tables));

    return helpers.orErr(new Error('not-found'), maybeModel);
  }
}

export default HomeRoute;
