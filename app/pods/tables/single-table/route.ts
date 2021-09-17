import Route from '@ember/routing/route';
import debugLogger from 'ember-debug-logger';

const debug = debugLogger('route:tables.single-table');

type Params = {
  table: string;
};

class TableRoute extends Route {
  public async model(params: Params): Promise<void> {
    debug('loading table details - "%s"', params.table);
  }
}

export default TableRoute;
