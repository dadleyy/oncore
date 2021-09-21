import Service from '@ember/service';
import config from 'oncore/config/environment';
import fetchApi from 'fetch';
import * as Seidr from 'seidr';
import * as promises from 'oncore/utility/promise-helpers';
import debugLogger from 'ember-debug-logger';

const debug = debugLogger('service:stickbot');

export type BetSubmission = {
  job: string;
};

export type Bet = {
  race?: [string, number, number | null];
};

export type Seat = {
  balance: number;
  bets: Array<Bet>;
};

export type Table = {
  id: string;
  nonce: string;
  seats: Record<string, Seat>;
};

async function post<T>(
  url: string,
  body: string
): Promise<Seidr.Result<Error, T>> {
  const headers = { 'Content-Type': 'application/json' };
  const attempt = fetchApi(url, { method: 'POST', body, headers });
  const response = await promises.awaitResult(attempt);
  const safe = response.flatMap((response) =>
    response.status === 200
      ? Seidr.Ok(response)
      : Seidr.Err(new Error('bad-response'))
  );
  return promises.asyncMap(safe, (response) => response.json());
}

class Stickbot extends Service {
  public async leave(id: string): Promise<Seidr.Result<Error, []>> {
    const body = JSON.stringify({ id });
    const result = await post(`${config.apiUrl}/leave-table`, body);
    return result.map(() => []);
  }

  public async join(id: string): Promise<Seidr.Result<Error, []>> {
    const body = JSON.stringify({ id });
    const result = await post(`${config.apiUrl}/join-table`, body);
    debug('joining table "%s"', id);
    return result.map(() => []);
  }

  public async bet(
    table: Pick<Table, 'id' | 'nonce'>,
    kind: string,
    amount: number
  ): Promise<Seidr.Result<Error, BetSubmission>> {
    const body = JSON.stringify({
      kind,
      amount,
      table: table.id,
      nonce: table.nonce,
    });
    debug('placing "%s" for "%s"', kind, amount);
    const submission = await post<BetSubmission>(`${config.apiUrl}/bets`, body);
    debug('bet submission %j', submission);
    return submission;
  }

  public async tables(): Promise<Seidr.Result<Error, Array<Table>>> {
    const result = await promises.awaitResult(
      fetchApi(`${config.apiUrl}/tables`)
    );
    const tables = await promises.asyncMap(result, (response) =>
      response.json()
    );
    return tables;
  }
}

export default Stickbot;
