import Component from '@glimmer/component';
import * as StickbotBets from 'oncore/stickbot/stickbot-bet';

type Args = {
  bets: Array<StickbotBets.PlacedBed>;
  pendingBets: Array<string>;
};

type ProjectedBet = {
  bet: StickbotBets.PlacedBed;
};

class BetList extends Component<Args> {
  public get empty(): boolean {
    const { pendingBets = [], bets = [] } = this.args;
    return pendingBets.length === 0 && bets.length === 0;
  }

  public get projectedBets(): Array<ProjectedBet> {
    const { bets = [] } = this.args;
    return bets.map((bet) => ({ bet }));
  }
}

export default BetList;
