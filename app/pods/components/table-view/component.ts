import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import Stickbot from 'oncore/services/stickbot';
import Session from 'oncore/services/session';
import { action } from '@ember/object';
import debugLogger from 'ember-debug-logger';
import * as State from 'oncore/pods/components/table-view/state';

const debug = debugLogger('component:table-view');

class TableView extends Component<{ state: State.State }> {
  public tagName = '';

  @tracked
  public wager = 0;

  @service
  public declare session: Session;

  @service
  public declare stickbot: Stickbot;

  @tracked
  public polls: Array<State.State> = [];

  @tracked
  public pendingJobs: Array<string> = [];

  public get state(): State.State {
    const { polls } = this;
    const [first = this.args.state] = polls;
    return first;
  }

  @action
  public async startPolling(): Promise<void> {
    const { stickbot, state, session } = this;
    debug('entering poll loop for table "%s"', state.table.id);
    const current = session.currentSession.getOrElse(undefined);

    while (!this.isDestroyed && current) {
      debug('fetching new state');
      const result = await State.load(stickbot, state.table.id, current);
      const next = result.getOrElse(undefined);

      if (this.isDestroyed || !next) {
        break;
      }

      debug('fetched new state');
      this.polls = [next, ...this.polls].slice(0, 5);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    debug('polling complete, component unmounted');
  }

  @action
  public async setWager(event: InputEvent): Promise<void> {
    const wager = parseInt((event.target as HTMLInputElement).value, 10);
    debug('setting wager "%s"', wager);

    if (!isNaN(wager)) {
      this.wager = wager;
    }
  }

  @action
  public async bet(kind: string): Promise<void> {
    const { wager, stickbot, state } = this;
    debug('placing bet wager "%s"', kind);
    const result = await stickbot.bet(state.table, kind, wager);
    this.wager = 0;
    const attempt = result.getOrElse(undefined);

    if (!attempt) {
      return;
    }

    debug('attempt made, job "%s"', attempt.job);
    this.pendingJobs = [attempt.job, ...this.pendingJobs];
  }

  @action
  public async comeOdds(target: number): Promise<void> {
    const { wager, state , stickbot } = this;
    debug('taking come "%s" odds on the "%s"', wager, target);
    await stickbot.odds(state.table, target, wager);
    this.wager = 0;
  }

  @action
  public async roll(): Promise<void> {
    const { state, stickbot } = this;
    debug('rolling the dice!');
    await stickbot.roll(state.table);
  }
}

export default TableView;
