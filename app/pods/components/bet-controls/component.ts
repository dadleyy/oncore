import Component from '@glimmer/component';
import { action } from '@ember/object';
import debugLogger from 'ember-debug-logger';
import * as State from 'oncore/pods/components/table-view/state';
import * as Seidr from 'seidr';
import * as maybeHelpers from 'oncore/utility/maybe-helpers';

const debug = debugLogger('component:bet-controls');

function getComeTarget(bet: State.ParsedBet): Seidr.Maybe<number> {
  return bet.kind === 'come' ? Seidr.Maybe.fromNullable(bet.target) : Seidr.Nothing();
}

export type Args = {
  button?: number;
  busy?: boolean;
  bets: Array<State.ParsedBet>;
};

class BetControls extends Component<Args> {
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
  public bet(kind: string, target?: number): void {
    debug('initiating bet "%s" (target %s)', kind, target);
  }
}

export default BetControls;
