import Service from '@ember/service';
import { inject as service } from '@ember/service';
import Stickbot from 'oncore/services/stickbot';
import * as StickbotError from 'oncore/stickbot/stickbot-error';
import { CreatedJobHandle } from 'oncore/services/stickbot-jobs';
import * as Seidr from 'seidr';
import debugLogger from 'ember-debug-logger';

const debug = debugLogger('service:stickbot-table-membership');

class TableMembershipService extends Service {
  @service
  public declare stickbot: Stickbot;

  public async leave(id: string): Promise<Seidr.Result<StickbotError.default, string>> {
    const { stickbot } = this;
    debug('leaving table "%s"', id);
    const result = await stickbot.post<{ id: string }, CreatedJobHandle>('/leave-table', { id });
    return result.map((handle) => handle.job);
  }

  public async join(id: string): Promise<Seidr.Result<StickbotError.default, string>> {
    const { stickbot } = this;
    debug('joining table "%s"', id);
    const result = await stickbot.post<{ id: string }, CreatedJobHandle>('/join-table', { id });
    return result.map((handle) => handle.job);
  }
}

export default TableMembershipService;
