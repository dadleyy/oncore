import Component from '@glimmer/component';
import * as State from 'oncore/pods/components/table-view/state';

type Args = {
  bets: Array<State.ParsedBet>;
  pendingBets: Array<string>;
};

type ProjectedBet = {
  bet: State.ParsedBet;
};

class BetList extends Component<Args> {
  public get empty(): boolean {
    const { pendingBets, bets } = this.args;
    return pendingBets.length === 0 && bets.length === 0;
  }

  public get projectedBets(): Array<ProjectedBet> {
    const { bets } = this.args;
    return bets.map((bet) => ({ bet }));
  }
}

export default BetList;
