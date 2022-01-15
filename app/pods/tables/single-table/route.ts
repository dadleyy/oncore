import Route from '@ember/routing/route';
import type Stickbot from 'oncore/services/stickbot-tables';
import * as StickbotError from 'oncore/stickbot/stickbot-error';
import type SessionService from 'oncore/services/session';
import type RouterService from '@ember/routing/router-service';
import { inject as service } from '@ember/service';
import debugLogger from 'ember-debug-logger';
import * as State from 'oncore/pods/components/table-view/state';
import * as Seidr from 'seidr';
import * as helpers from 'oncore/utility/maybe-helpers';
import * as promises from 'oncore/utility/promise-helpers';

const debug = debugLogger('route:tables.single-table');

type Params = {
  table: string;
};

class TableRoute extends Route {
  @service
  public declare stickbotTables: Stickbot;

  @service
  public declare router: RouterService;

  @service
  public declare session: SessionService;

  public beforeModel(): void {
    const { router, session } = this;
    const identity = session.currentSession.getOrElse(undefined);

    if (!identity) {
      router.transitionTo('login');
      return;
    }
  }

  public async model(params: Params): Promise<Seidr.Result<StickbotError.default, State.State>> {
    const { stickbotTables: stickbot, session } = this;
    const identity = helpers.orErr(StickbotError.MissingResource(), session.currentSession);
    debug('loading table details - "%s"', params.table);
    return await promises.asyncFlatMap(identity, (session) => State.load(stickbot, params.table, session));
  }
}

export default TableRoute;
