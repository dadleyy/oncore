import Controller from '@ember/controller';
import type Stickbot from 'oncore/services/stickbot';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import debugLogger from 'ember-debug-logger';
import * as State from 'oncore/pods/tables/single-table/state';
import * as Seidr from 'seidr';

const debug = debugLogger('controller:tables.single-table');

class TableController extends Controller {
  public declare model: Seidr.Result<Error, State.Model>;

  @tracked
  public wager = 0;
  
  @service
  public declare stickbot: Stickbot;

  @action
  public async setWager(event: InputEvent): Promise<void> {
    const amount = (event.target as HTMLInputElement).value;
    debug('updating wager "%s"', amount);
    this.wager = parseInt(amount, 10);
  }

  @action
  public async bet(kind: string): Promise<void> {
    const { wager, stickbot, model } = this;
    const tableId = model.map(state => state.table.id).getOrElse(undefined);

    if (!tableId) {
      return;
    }

    debug('placing "%s" bet - %s', kind, wager);
    await stickbot.bet(tableId, kind, wager);
  }
}

export default TableController;
