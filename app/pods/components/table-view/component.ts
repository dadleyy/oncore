import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import * as Stickbot from 'oncore/services/stickbot';
import { action } from '@ember/object';
import debugLogger from 'ember-debug-logger';
import * as State from 'oncore/pods/components/table-view/state';
import * as promises from 'oncore/utility/promise-helpers';

const debug = debugLogger('component:table-view');

const POLL_DELAY = 3000;

class TableView extends Component<{ state: State.State }> {
  public tagName = '';
  private wagerBox?: HTMLInputElement = undefined;

  @tracked
  public wager = 0;

  @service
  public declare stickbot: Stickbot.default;

  @tracked
  public history: Array<State.State> = [];

  public get state(): State.State {
    const { history } = this;
    const [first = this.args.state] = history;
    return first;
  }

  @action
  public async startPolling(): Promise<void> {
    const { stickbot, state } = this;
    debug('entering poll loop for table "%s"', state.table.id);

    while (!this.isDestroyed) {
      const { state: current } = this;
      const result = await State.hydrate(stickbot, current);

      if (this.isDestroyed) {
        debug('breaking poll loop early - component torn down');
        break;
      }

      const next = result.getOrElse(undefined);

      if (!next) {
        debug('[warning] bad response from api - %j', result);
        await promises.sleep(POLL_DELAY * 10);
        continue;
      }

      if (next.nonce !== this.state.nonce) {
        debug('stale poll (current %s | loaded %s)', this.state.nonce, next.nonce);
        await promises.sleep(POLL_DELAY);
        continue;
      }

      debug('fetched new state');
      this.history = [State.makeBusy(next, this.state.busy), ...this.history].slice(0, 2);
      await promises.sleep(POLL_DELAY);
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
    this.history = [State.makeBusy(state), ...this.history];
    const result = await stickbot.bet(state.table, kind, wager);
    this.finishBet(result);
  }

  @action
  public async comeOdds(target: number): Promise<void> {
    const { wager, state, stickbot } = this;
    debug('taking come "%s" odds on the "%s"', wager, target);
    this.history = [State.makeBusy(state), ...this.history];
    this.finishBet(await stickbot.odds(state.table, target, wager));
  }

  @action
  public async hardway(target: number): Promise<void> {
    const { wager, state, stickbot } = this;
    debug('submitting hardway bet for "%s"', target);
    this.history = [State.makeBusy(state), ...this.history];
    this.finishBet(await stickbot.hardway(state.table, target, wager));
  }

  @action
  public async place(target: number): Promise<void> {
    const { wager, state, stickbot } = this;
    debug('submitting place bet for "%s"', target);
    this.history = [State.makeBusy(state), ...this.history];
    this.finishBet(await stickbot.place(state.table, target, wager));
  }

  @action
  public async roll(): Promise<void> {
    const { state, stickbot } = this;
    const start = State.makeBusy(state);
    this.history = [start, ...this.history];
    const result = await stickbot.roll(state.table);

    const next = result.caseOf({
      Err: (error) => {
        debug('[warning] roll submission failed - %s', error);
        return state;
      },
      Ok: (job) => State.setPendingRoll(start, { id: job.job }),
    });

    this.history = [State.makeBusy(next, false), ...this.history];
  }

  @action
  public setWagerBox(element: HTMLInputElement): void {
    this.wagerBox = element;
  }

  private finishBet(result: Stickbot.BetSubmissionResult): void {
    const { state: current, wagerBox } = this;

    debug('applying pending bet "%j"', result);

    const next = result.caseOf({
      Err: (error) => {
        debug('[warn] bet submission totally failed %s', error);
        return current;
      },
      Ok: (job) => State.addPendingBet(current, { id: job.job }),
    });

    this.history = [State.makeBusy(next, false), ...this.history];

    this.wager = 0;
    if (wagerBox) {
      wagerBox.focus();
    }
  }
}

export default TableView;
