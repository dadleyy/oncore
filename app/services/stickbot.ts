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

export type Table = {
  id: string;
  nonce: string;
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
  public async fetch<T>(url: string): Promise<Seidr.Result<Error, T>> {
    const result = await promises.awaitResult(fetchApi(`${config.apiURL}${url}`));
    return await promises.asyncMap(result, (response) => response.json());
  }

  public async post<D, T>(url: string, data?: D): Promise<Seidr.Result<Error, T>> {
    return post(url, data ? JSON.stringify(data) : '');
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
}

export default Stickbot;
