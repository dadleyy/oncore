import Controller from '@ember/controller';
import type SessionService from 'oncore/services/session';
import type RouterUtils from 'oncore/services/router-utility';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import debugLogger from 'ember-debug-logger';
import * as Stickbot from 'oncore/services/stickbot';

const debug = debugLogger('controller:home');

class HomeController extends Controller {
  @service
  public stickbot!: Stickbot.default;

  @service
  public session!: SessionService;

  @service
  public routerUtility!: RouterUtils;

  @action
  public async leaveTable(table: Stickbot.Table): Promise<void> {
    const { stickbot, session, routerUtility: router } = this;
    debug('joining table - %j', table);
    const result = await stickbot.leave(table.id);

    // We are reloading the session here to re-hydrate some of the global user information displayed higher.
    await session.identify();

    result.caseOf({
      Err: (error) => window.alert(`${error.message}`),
      Ok: () => {
        debug('successfully left');
        router.refresh(router.routeName);
      },
    });
  }

  @action
  public async joinTable(table: Stickbot.Table): Promise<void> {
    const { stickbot, session, routerUtility: router } = this;
    debug('joining table - %j', table);
    const result = await stickbot.join(table.id);

    // We are reloading the session here to re-hydrate some of the global user information displayed higher.
    await session.identify();

    result.caseOf({
      Err: (error) => window.alert(`${error.message}`),
      Ok: () => {
        debug('successfully joined');
        router.transitionTo('tables.single-table', table.id);
      },
    });
  }
}

export default HomeController;
