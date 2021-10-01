import Component from '@glimmer/component';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { cancel, later } from '@ember/runloop';
import debugLogger from 'ember-debug-logger';
import Modals from 'oncore/services/modals';
import * as State from 'oncore/pods/components/table-view/state';
import * as Seidr from 'seidr';
import * as maybeHelpers from 'oncore/utility/maybe-helpers';
import * as BetAttempts from 'oncore/pods/components/bet-controls/bet-attempt';
import { KEY } from 'oncore/pods/components/bet-controls/wager-input-modal/component';

const debug = debugLogger('component:bet-controls');

type Timeout = ReturnType<typeof later>;

function getComeTarget(bet: State.ParsedBet): Seidr.Maybe<number> {
  return bet.kind === 'come' ? Seidr.Maybe.fromNullable(bet.target) : Seidr.Nothing();
}

export type Args = {
  button?: number;
  busy?: boolean;
  bets: Array<State.ParsedBet>;
  attempt: (attempt: BetAttempts.default) => void;
};

enum Shortcut {
  Pass,
  Come,
  PassOdds,
  Field,
}

function parseKeys(keys: Array<string>): Shortcut | null {
  const [first, second] = keys;

  if (first === 'p' && second === 'b') {
    return Shortcut.Pass;
  }

  if (first === 'c' && second === 'b') {
    return Shortcut.Come;
  }

  if (first === 'o' && second === 'b') {
    return Shortcut.PassOdds;
  }

  if (first === 'f' && second === 'b') {
    return Shortcut.Field;
  }

  return null;
}

class BetControls extends Component<Args> {
  @service
  public declare modals: Modals;

  private keyseq: { keys: Array<string>; id?: Timeout } = { keys: [] };

  public get hasPass(): boolean {
    const { bets = [] } = this.args;
    return bets.some((bet) => bet.kind === 'pass');
  }

  public get comeOddsOptions(): Array<number> {
    const { bets = [] } = this.args;
    const maybeComes = bets.map(getComeTarget);
    return maybeHelpers.flatten(maybeComes);
  }

  @action
  public sequence(event: KeyboardEvent): void {
    const { keyseq } = this;
    debug('sequencing keyboard event "%s"', event.key);

    if (keyseq.id) {
      cancel(keyseq.id);
    }

    const keys = [event.key, ...keyseq.keys].slice(0, 10);
    const id = later(this, this.dumseq, 500);

    switch (parseKeys(keys)) {
      case Shortcut.Pass:
        this.bet('pass');
        break;
      case Shortcut.PassOdds:
        this.bet('pass-odds');
        break;
      case Shortcut.Come:
        this.bet('come');
        break;
      case Shortcut.Field:
        this.bet('field');
        break;
      default:
        debug('new keyseq - %j', keys);
        this.keyseq = { id, keys };
        return;
    }

    this.dumseq();
    event.stopPropagation();
    event.preventDefault();
  }

  @action
  public async bet(kind: string, target?: number): Promise<void | null> {
    const { modals } = this;
    debug('initiating bet "%s" (target %s)', kind, target);

    const wager = maybeHelpers.collect(await modals.activate(KEY, { kind })).getOrElse(undefined);

    if (!wager) {
      return;
    }

    debug('attempting to place "%s" wager "%s"', kind, wager);

    switch (kind) {
      case 'pass':
        return this.args.attempt(BetAttempts.Pass(wager));
      case 'pass-odds':
        return this.args.attempt(BetAttempts.PassOdds(wager));
      case 'come':
        return this.args.attempt(BetAttempts.Come(wager));
      case 'come-odds':
        return target ? this.args.attempt(BetAttempts.ComeOdds(target, wager)) : null;
      case 'hardway':
        return target ? this.args.attempt(BetAttempts.Hardway(target, wager)) : null;
      case 'place':
        return target ? this.args.attempt(BetAttempts.Place(target, wager)) : null;
      case 'field':
        return this.args.attempt(BetAttempts.Field(wager));
        break;
    }
  }

  private dumseq(): void {
    const { keyseq } = this;
    debug('dumping keyboard sequence %j', keyseq);
    this.keyseq = { keys: [] };
  }
}

export default BetControls;
