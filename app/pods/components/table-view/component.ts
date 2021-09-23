import Component from '@glimmer/component';
import { later } from '@ember/runloop';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import * as Stickbot from 'oncore/services/stickbot';
import { action } from '@ember/object';
import debugLogger from 'ember-debug-logger';
import * as State from 'oncore/pods/components/table-view/state';
import * as keyboard from 'oncore/pods/components/table-view/keyboard';
import * as promises from 'oncore/utility/promise-helpers';

const debug = debugLogger('component:table-view');

const POLL_DELAY = 3000;

class TableView extends Component<{ state: State.State }> {
  public tagName = '';
  private wagerBox?: HTMLInputElement = undefined;

  private keyboard: keyboard.Keyboard = keyboard.empty();

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
  public async shortcut(event: KeyboardEvent): Promise<void> {
    const { keyboard: current } = this;

    if (current.id) {
      clearTimeout(current.id);
    }

    const next = keyboard.apply(current, event.key);

    const id = setTimeout(() => {
      debug('clearing current sequence, timeout');
      this.keyboard = keyboard.empty();
    }, 1000);

    const maybeCommand = keyboard.parse(next);
    const command = maybeCommand.getOrElse(undefined);
    this.keyboard = maybeCommand.map(() => keyboard.empty()).getOrElse({ ...next, id });

    if (command === undefined || !this.wager) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    switch (command.type) {
      case 'field':
        this.bet('field');
        break;
      case 'pass':
        this.bet('pass');
        break;
      case 'pass-odds':
        this.bet('pass-odds');
        break;
      case 'come':
        this.bet('come');
        break;
      case 'place':
        debug('submitting place bet for "%s"', command.target);
        break;
      default:
        debug('unknown command "%s"', command);
    }
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
  public setWager(event: InputEvent): void {
    const wager = parseInt((event.target as HTMLInputElement).value, 10);
    debug('setting wager "%s"', wager);

    if (isNaN(wager)) {
      event.stopPropagation();
      event.preventDefault();
      return;
    }

    this.wager = wager;
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
    this.wager = 0;

    later(this, this.focusWagerBox, 300);
  }

  private focusWagerBox() {
    const { wagerBox } = this;

    if (!wagerBox) {
      return;
    }

    debug('focus and select wager box');
    wagerBox.focus();
    wagerBox.select();
  }
}

export default TableView;
