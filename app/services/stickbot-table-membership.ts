import Service from '@ember/service';
import { inject as service } from '@ember/service';
import type Stickbot from 'oncore/services/stickbot';
import * as Seidr from 'seidr';
import debugLogger from 'ember-debug-logger';

const debug = debugLogger('service:stickbot-table-membership');

class TableMembershipService extends Service {
  @service
  public declare stickbot: Stickbot;

  public async leave(id: string): Promise<Seidr.Result<Error, string>> {
    const { stickbot } = this;
    debug('leaving table "%s"', id);
    const result = await stickbot.post('/leave-table', { id });
    return result.map(() => '');
  }

  public async join(id: string): Promise<Seidr.Result<Error, string>> {
    const { stickbot } = this;
    debug('joining table "%s"', id);
    const result = await stickbot.post('/join-table', { id });
    return result.map(() => '');
  }
}

export default TableMembershipService;
