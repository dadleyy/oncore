import Service from '@ember/service';
import { inject as service } from '@ember/service';
import { dasherize } from '@ember/string';
import { CreatedJobHandle } from 'oncore/services/stickbot-jobs';
import Stickbot from 'oncore/services/stickbot';
import * as StickbotError from 'oncore/stickbot/stickbot-error';
import * as StickbotBet from 'oncore/stickbot/stickbot-bet';
import * as Seidr from 'seidr';
import * as maybeHelpers from 'oncore/utility/maybe-helpers';
import debugLogger from 'ember-debug-logger';

const debug = debugLogger('service:stickbot-table-index');

type TableIndexMember = [string, string];

export type TableIndex = {
  id: string;
  name: string;
  population: Array<TableIndexMember>;
};

export type Seat = {
  id: string;
  balance: number;
  nickname: string;
  bets: Array<StickbotBet.PlacedBed>;
  history: Array<StickbotBet.BetResult>;
};

export type TableDetails = {
  id: string;
  nonce: string;
  name: string;
  roller: string | null;
  seats: Array<Seat>;
  rolls: Array<[number, number]>;
};

export type BetResultResponse = [BetResponse, boolean, number];

export type BetResponse = {
  race?: [string, number, number | null];
  target?: [string, number, number];
  field?: number;
};

export type SeatResponse = {
  balance: number;
  nickname: string;
  bets: Array<BetResponse>;
  history: Array<BetResultResponse>;
};

export type TableDetailsResponse = {
  id: string;
  nonce: string;
  name: string;
  roller: string | null;
  seats: Record<string, SeatResponse>;
  rolls: Array<[number, number]>;
};

export function parseBet(res: BetResponse): Seidr.Maybe<StickbotBet.PlacedBed> {
  if (res.target) {
    const [kind, amount, target] = res.target;
    const normalized = dasherize(kind);

    switch(normalized) {
      case 'hardway':
        return Seidr.Just(StickbotBet.PlacedHardwayBet(amount, target));
      case 'place':
        return Seidr.Just(StickbotBet.PlacedPlaceBet(amount, target));
      case 'come-odds':
        return Seidr.Just(StickbotBet.PlacedComeOddsBet(amount, target));
      case 'pass-odds':
        return Seidr.Just(StickbotBet.PlacedPassOddsBet(amount, target));
    }
  }

  if (res.field) {
    return Seidr.Maybe.fromNullable(res.field).map(StickbotBet.PlacedFieldBet);
  }

  if (res.race) {
    const [kind, amount, target] = res.race;
    const normalized = dasherize(kind);

    switch (normalized) {
      case 'come':
        return Seidr.Just(StickbotBet.PlacedComeBet(amount, Seidr.Maybe.fromNullable(target)));
      case 'pass':
        return Seidr.Just(StickbotBet.PlacedPassBet(amount, Seidr.Maybe.fromNullable(target)));
    }
  }

  debug('[warning] unable to parse bet "%j"', res);
  return Seidr.Nothing();
}

function parseTableDetailResponse(res: TableDetailsResponse): TableDetails {
  const seats = Object.entries(res.seats).map(([id, data]) => {
    return {
      ...data,
      id,
      bets: maybeHelpers.flatten(data.bets.map(parseBet)),
      history: [],
    };
  });

  return {
    ...res,
    seats,
  };
}

class TableIndexService extends Service {
  @service
  public declare stickbot: Stickbot;

  public async create(): Promise<Seidr.Result<StickbotError.default, string>> {
    const { stickbot } = this;
    const result = await stickbot.post<void, CreatedJobHandle>('/tables');
    return result.map((d) => d.job);
  }

  public async find(id: string): Promise<Seidr.Result<StickbotError.default, TableDetails>> {
    const { stickbot } = this;
    debug('attempting to load "%s"', id);
    const result = await stickbot.fetch(`/table?id=${id}`);
    return result.map(parseTableDetailResponse);
  }

  public async seek(): Promise<Seidr.Result<StickbotError.default, Array<TableIndex>>> {
    const { stickbot } = this;
    debug('loading table index');
    return await stickbot.fetch('/tables');
  }
}

export default TableIndexService;
