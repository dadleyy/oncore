import Route from '@ember/routing/route';
import type Stickbot from 'oncore/services/stickbot';
import type SessionService from 'oncore/services/session';
import type RouterService from '@ember/routing/router-service';
import { inject as service } from '@ember/service';
import debugLogger from 'ember-debug-logger';
import * as State from 'oncore/pods/tables/single-table/state';
import * as Seidr from 'seidr';
import * as helpers from 'oncore/utility/maybe-helpers';

const debug = debugLogger('route:tables.single-table');

type Params = {
  table: string;
};

class TableRoute extends Route {
  @service
  public declare stickbot: Stickbot;

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

  public async model(
    params: Params
  ): Promise<Seidr.Result<Error, State.Model>> {
    const { stickbot, session } = this;
    const identity = helpers.orErr(new Error('unauth'), session.currentSession);
    const tables = await stickbot.tables();
    debug('loading table details - "%s"', params.table);
    return identity.flatMap((id) =>
      tables.flatMap((tables) => State.fromTables(params.table, tables, id))
    );
  }
}

export default TableRoute;
