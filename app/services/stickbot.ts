import Service from '@ember/service';
import config from 'oncore/config/environment';
import fetchApi from 'fetch';
import * as Seidr from 'seidr';
import * as promises from 'oncore/utility/promise-helpers';
import debugLogger from 'ember-debug-logger';

const debug = debugLogger('service:stickbot');

export type TableCreationResponse = {
  id: string;
};

export type BetSubmission = {
  job: string;
};

export type Bet = {
  race?: [string, number, number | null];
  target?: [string, number, number | null];
  field?: number;
};

export type Seat = {
  balance: number;
  bets: Array<Bet>;
};

export type Table = {
  id: string;
  nonce: string;
  name: string;
  roller: string | null;
  seats: Record<string, Seat>;
  rolls: Array<[number, number]>;
};

type BetFailed = {
  BetFailed: string;
};

export type JobStatus = {
  id: string;
  output?: 'BetProcessed' | BetFailed;
};

export type BetSubmissionResult = Seidr.Result<Error, BetSubmission>;

async function post<T>(url: string, body: string): Promise<Seidr.Result<Error, T>> {
  const headers = { 'Content-Type': 'application/json' };
  const attempt = fetchApi(url, { method: 'POST', body, headers });
  const response = await promises.awaitResult(attempt);
  const safe = response.flatMap((response) =>
    response.status === 200 ? Seidr.Ok(response) : Seidr.Err(new Error('bad-response'))
  );
  return promises.asyncMap(safe, (response) => response.json());
}

class Stickbot extends Service {
  public async leave(id: string): Promise<Seidr.Result<Error, []>> {
    const body = JSON.stringify({ id });
    const result = await post(`${config.apiURL}/leave-table`, body);
    return result.map(() => []);
  }

  public async join(id: string): Promise<Seidr.Result<Error, []>> {
    const body = JSON.stringify({ id });
    const result = await post(`${config.apiURL}/join-table`, body);
    debug('joining table "%s"', id);
    return result.map(() => []);
  }

  public async job(id: string): Promise<Seidr.Result<Error, JobStatus>> {
    const result = await promises.awaitResult(fetchApi(`${config.apiURL}/job?id=${id}`, {}));
    return promises.asyncMap(result, (res) => res.json());
  }

  public async roll(table: Pick<Table, 'id' | 'nonce'>): Promise<Seidr.Result<Error, BetSubmission>> {
    debug('attempting to start roll on table "%s"', table.id);
    const body = JSON.stringify({ table: table.id, nonce: table.nonce });
    return post(`${config.apiURL}/rolls`, body);
  }

  public async hardway(
    table: Pick<Table, 'id' | 'nonce'>,
    target: number,
    amount: number
  ): Promise<BetSubmissionResult> {
    const body = JSON.stringify({
      kind: 'hardway',
      amount,
      target,
      table: table.id,
      nonce: table.nonce,
    });
    return await post<BetSubmission>(`${config.apiURL}/bets`, body);
  }

  public async place(table: Pick<Table, 'id' | 'nonce'>, target: number, amount: number): Promise<BetSubmissionResult> {
    const body = JSON.stringify({
      kind: 'place',
      amount,
      target,
      table: table.id,
      nonce: table.nonce,
    });
    return await post<BetSubmission>(`${config.apiURL}/bets`, body);
  }

  public async odds(table: Pick<Table, 'id' | 'nonce'>, target: number, amount: number): Promise<BetSubmissionResult> {
    const body = JSON.stringify({
      kind: 'come-odds',
      amount,
      target,
      table: table.id,
      nonce: table.nonce,
    });
    const submission = await post<BetSubmission>(`${config.apiURL}/bets`, body);
    return submission;
  }

  public async bet(table: Pick<Table, 'id' | 'nonce'>, kind: string, amount: number): Promise<BetSubmissionResult> {
    const body = JSON.stringify({
      kind,
      amount,
      table: table.id,
      nonce: table.nonce,
    });
    debug('placing "%s" for "%s"', kind, amount);
    const submission = await post<BetSubmission>(`${config.apiURL}/bets`, body);
    debug('bet submission %j', submission);
    return submission;
  }

  public async createTable(): Promise<Seidr.Result<Error, string>> {
    const result = await post<TableCreationResponse>(`${config.apiURL}/tables`, '');
    debug('table creation completed with "%j"', result);
    return result.map((res) => res.id);
  }

  public async table(id: string): Promise<Seidr.Result<Error, Table>> {
    const result = await promises.awaitResult(fetchApi(`${config.apiURL}/table?id=${id}`));
    const tables = await promises.asyncMap(result, (response) => response.json());
    return tables;
  }

  public async tables(): Promise<Seidr.Result<Error, Array<Table>>> {
    const result = await promises.awaitResult(fetchApi(`${config.apiURL}/tables`));
    const tables = await promises.asyncMap(result, (response) => response.json());
    return tables;
  }
}

export default Stickbot;
