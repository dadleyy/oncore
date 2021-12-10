import Controller from '@ember/controller';
import type SessionService from 'oncore/services/session';
import type RouterUtils from 'oncore/services/router-utility';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import debugLogger from 'ember-debug-logger';
import * as StickbotTables from 'oncore/services/stickbot-tables';
import * as StickbotTableMembership from 'oncore/services/stickbot-table-membership';

const debug = debugLogger('controller:home');

class HomeController extends Controller {
  @service
  public declare stickbotTables: StickbotTables.default;

  @service
  public declare stickbotTableMembership: StickbotTableMembership.default;

  @service
  public declare session: SessionService;

  @service
  public routerUtility!: RouterUtils;

  @action
  public async leaveTable(id: string): Promise<void> {
    const { stickbotTableMembership: stickbot, session, routerUtility: router } = this;
    debug('leaving table - "%j"', id);
    const result = await stickbot.leave(id);

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
  public async joinTable(id: string): Promise<void> {
    const { stickbotTableMembership: stickbot, session, routerUtility: router } = this;
    debug('joining table - "%s"', id);
    const result = await stickbot.join(id);

    // We are reloading the session here to re-hydrate some of the global user information displayed higher.
    await session.identify();

    result.caseOf({
      Err: (error) => window.alert(`${error.message}`),
      Ok: () => {
        debug('successfully joined');
        router.transitionTo('tables.single-table', id);
      },
    });
  }

  @action
  public async createTable(): Promise<void> {
    const { stickbotTables: stickbot, routerUtility: router } = this;
    const tableId = (await stickbot.create()).getOrElse(undefined);

    if (!tableId) {
      debug('failed creating new table');
      alert('Unable to create new table');
      return;
    }

    debug('created new table "%j"', tableId);
    router.transitionTo('tables.single-table', tableId);
    return;
  }
}

export default HomeController;
