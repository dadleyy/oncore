import Service from '@ember/service';
import { inject as service } from '@ember/service';
import type Stickbot from 'oncore/services/stickbot';
import * as Seidr from 'seidr';
import debugLogger from 'ember-debug-logger';

const debug = debugLogger('service:stickbot-table-index');

type TableIndexMember = [string, string];

export type TableIndex = {
  id: string;
  name: string;
  population: Array<TableIndexMember>;
};

export type Bet = {
  race?: [string, number, number | null];
  target?: [string, number, number | null];
  field?: number;
};

export type Seat = {
  balance: number;
  nickname: string;
  bets: Array<Bet>;
};

export type TableDetails = {
  id: string;
  nonce: string;
  name: string;
  roller: string | null;
  seats: Record<string, Seat>;
  rolls: Array<[number, number]>;
};

class TableIndexService extends Service {
  @service
  public declare stickbot: Stickbot;

  public async create(): Promise<Seidr.Result<Error, string>> {
    const { stickbot } = this;
    const result = await stickbot.post<void, { id: string }>('/tables');
    return result.map((d) => d.id);
  }

  public async find(id: string): Promise<Seidr.Result<Error, TableDetails>> {
    const { stickbot } = this;
    debug('attempting to load "%s"', id);
    return await stickbot.fetch(`/table?id=${id}`);
  }

  public async seek(): Promise<Seidr.Result<Error, Array<TableIndex>>> {
    const { stickbot } = this;
    debug('loading table index');
    return await stickbot.fetch('/tables');
  }
}

export default TableIndexService;