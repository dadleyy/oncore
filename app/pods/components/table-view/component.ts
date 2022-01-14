import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import * as Stick from 'oncore/services/stickbot';
import * as Toasts from 'oncore/services/toasts';
import * as Stickbot from 'oncore/services/stickbot-tables';
import * as Jobs from 'oncore/services/stickbot-jobs';
import { action } from '@ember/object';
import debugLogger from 'ember-debug-logger';
import * as State from 'oncore/pods/components/table-view/state';
import * as promises from 'oncore/utility/promise-helpers';
import * as BetAttempts from 'oncore/pods/components/bet-controls/bet-attempt';
import { compare } from '@ember/utils';

const debug = debugLogger('component:table-view');

const POLL_DELAY = 1500;

class TableView extends Component<{ state: State.State }> {
  public tagName = '';

  @service
  public declare stickbot: Stick.default;

  @service
  public declare stickbotTables: Stickbot.default;

  @service
  public declare toasts: Toasts.default;

  @service
  public declare stickbotJobs: Jobs.default;

  @tracked
  public history: Array<State.State> = [];

  public get isRoller(): boolean {
    const { state } = this;
    return State.isRoller(state);
  }

  public get selectedSeatId(): string {
    const { state } = this;
    return state.selectedSeat.map((seat) => seat.id).getOrElse('');
  }

  public get state(): State.State {
    const { history } = this;
    const [first = this.args.state] = history;
    return first;
  }

  public get visibleSeats(): Array<State.Seat> {
    const { state } = this;
    return state.seats.slice(0, 4).sort((a, b) => compare(a.id, b.id));
  }

  @action
  public selectSeat(id: string): void {
    const { state } = this;
    debug('setting active seat "%s"', id, state);
    const next = State.setActiveSeat(state, id);
    this.history = [next, ...this.history].slice(0, 4);
  }

  @action
  public async startPolling(): Promise<void> {
    const { stickbotTables: stickbot, toasts, stickbotJobs: jobs, state } = this;
    debug('entering poll loop for table "%s"', state.table.id);

    while (!this.isDestroyed) {
      const { state: current } = this;
      const result = await State.hydrate(stickbot, jobs, current);

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

      // If we've since received an update to our state, skip any updates that would otherwise have been applied.
      if (next.nonce !== this.state.nonce) {
        debug('stale poll (current %s | loaded %s)', this.state.nonce, next.nonce);
        await promises.sleep(POLL_DELAY);
        continue;
      }

      while (next.failedBets.length) {
        const failure = next.failedBets.pop();

        if (!failure) {
          continue;
        }

        debug('state hydrated with some failed bet "%o"', failure);
        toasts.add(Toasts.SimpleWarning(failure.reason));
      }

      this.history = [State.makeBusy(next, this.state.busy), ...this.history].slice(0, 2);
      await promises.sleep(POLL_DELAY);
    }

    debug('polling complete, component unmounted');
  }

  @action
  public async roll(): Promise<void> {
    const { state, isRoller, stickbot } = this;

    if (!isRoller) {
      debug('current user not roller, aborting');
      return;
    }

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

  private finishBet(result: Stick.BetSubmissionResult): void {
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
