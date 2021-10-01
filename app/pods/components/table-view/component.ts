import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import * as Stickbot from 'oncore/services/stickbot';
import { action } from '@ember/object';
import debugLogger from 'ember-debug-logger';
import * as State from 'oncore/pods/components/table-view/state';
import * as promises from 'oncore/utility/promise-helpers';
import * as BetAttempts from 'oncore/pods/components/bet-controls/bet-attempt';

const debug = debugLogger('component:table-view');

const POLL_DELAY = 3000;

class TableView extends Component<{ state: State.State }> {
  public tagName = '';

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

      this.history = [State.makeBusy(next, this.state.busy), ...this.history].slice(0, 2);
      await promises.sleep(POLL_DELAY);
    }

    debug('polling complete, component unmounted');
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
  public dismissBet(id: string): void {
    const { state } = this;
    debug('dismissing bet "%s"', id);
    const next = State.dismissBet(state, id);
    this.history = [next, ...this.history];
  }

  @action
  public async bet(attempt: BetAttempts.default): Promise<void> {
    const { stickbot, state } = this;

    debug('attempting to make bet "%j"', attempt);

    const submission = await attempt.caseOf({
      Field: (amount) => stickbot.bet(state.table, 'field', amount),
      Pass: (amount) => stickbot.bet(state.table, 'pass', amount),
      PassOdds: (amount) => stickbot.bet(state.table, 'pass-odds', amount),
      Come: (amount) => stickbot.bet(state.table, 'come', amount),
      ComeOdds: (target, amount) => stickbot.odds(state.table, target, amount),
      Hardway: (target, amount) => stickbot.hardway(state.table, target, amount),
      Place: (target, amount) => stickbot.place(state.table, target, amount),
    });

    this.finishBet(submission);
  }

  private finishBet(result: Stickbot.BetSubmissionResult): void {
    const { state: current } = this;

    debug('applying pending bet "%j"', result);

    const next = result.caseOf({
      Err: (error) => {
        debug('[warn] bet submission totally failed %s', error);
        return current;
      },
      Ok: (job) => State.addPendingBet(current, { id: job.job }),
    });

    this.history = [State.makeBusy(next, false), ...this.history];
  }
}

export default TableView;
