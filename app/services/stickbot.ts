import Service, { inject as service } from '@ember/service';
import Session from 'oncore/services/session';
import RouterUtility from 'oncore/services/router-utility';
import config from 'oncore/config/environment';
import { next } from '@ember/runloop';
import fetchApi from 'fetch';
import * as Seidr from 'seidr';
import * as promises from 'oncore/utility/promise-helpers';
import { always } from 'oncore/utility/fp-helpers';
import debugLogger from 'ember-debug-logger';
import * as StickbotError from 'oncore/stickbot/stickbot-error';

const debug = debugLogger('service:stickbot');

const HTTP_POST = 'POST';
const JSON_HEADERS = {
  'Content-Type': 'application/json',
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

export type BetSubmissionResult = Seidr.Result<StickbotError.default, BetSubmission>;

export function isMissing<T>(result: Seidr.Result<StickbotError.default, T>): boolean {
  return result.caseOf({
    Ok: always(false),
    Err: (error) => {
      return error.caseOf({
        MissingResource: always(true),
        _: always(false),
      });
    },
  });
}

async function normalizeResponse<T>(response: Response): Promise<Seidr.Result<StickbotError.default, T>> {
  if (response.status === 404) {
    return Seidr.Err(StickbotError.MissingResource());
  }

  if (response.status !== 200) {
    try {
      const text = await response.text();
      return Seidr.Err(StickbotError.UserError(text));
    } catch (error) {
      return Seidr.Err(StickbotError.Unknown(error));
    }
  }

  try {
    const parsed = await response.json();
    return Seidr.Ok(parsed);
  } catch (error) {
    return Seidr.Err(StickbotError.Unknown(error));
  }
}

async function post<T>(url: string, body: string): Promise<Seidr.Result<StickbotError.default, T>> {
  // Send the network request.
  const attempt = fetchApi(url, { method: HTTP_POST, body, headers: JSON_HEADERS });
  const response = await promises.awaitResult(attempt);
  // Map raised exceptions into `Unknown`.
  const safe = response.mapErr(StickbotError.Unknown);
  // Attempt to map "valid" response into actual data.
  return promises.asyncFlatMap(safe, (res) => normalizeResponse<T>(res));
}

class Stickbot extends Service {
  @service
  public declare session: Session;

  @service
  public declare routerUtility: RouterUtility;

  public async fetch<T>(url: string): Promise<Seidr.Result<StickbotError.default, T>> {
    const result = await promises.awaitResult(fetchApi(`${config.apiURL}${url}`));
    const safe = result.mapErr(StickbotError.Unknown);
    const parsed = await promises.asyncFlatMap(safe, (response) => normalizeResponse<T>(response));
    const missing = isMissing(parsed);

    if (missing) {
      const { session, routerUtility } = this;
      debug('[warning] missing resource, eagerly moving to login page');
      next(async () => {
        await session.identify();
        routerUtility.refresh();
      });
    }

    return parsed as Seidr.Result<StickbotError.default, T>;
  }

  public async post<D, T>(url: string, data?: D): Promise<Seidr.Result<StickbotError.default, T>> {
    const result = await post(`${config.apiURL}${url}`, data ? JSON.stringify(data) : '');
    const missing = isMissing(result);

    if (missing) {
      const { session, routerUtility } = this;
      debug('[warning] missing resource, eagerly moving to login page');
      next(async () => {
        await session.identify();
        routerUtility.refresh();
      });
    }

    return result as Seidr.Result<StickbotError.default, T>;
  }

  public async deleteAccount(): Promise<Seidr.Result<Error, boolean>> {
    const attempt = fetchApi(`${config.apiURL}/delete-account`, { method: HTTP_POST });
    const result = await promises.awaitResult(attempt);
    return result.map(() => true);
  }

  public async roll(table: Pick<Table, 'id' | 'nonce'>): Promise<Seidr.Result<StickbotError.default, BetSubmission>> {
    debug('attempting to start roll on table "%s"', table.id);
    return this.post(`/rolls`, { table: table.id, nonce: table.nonce });
  }

  public async hardway(
    table: Pick<Table, 'id' | 'nonce'>,
    target: number,
    amount: number
  ): Promise<BetSubmissionResult> {
    const body = {
      kind: 'hardway',
      amount,
      target,
      table: table.id,
      nonce: table.nonce,
    };
    return this.post(`/bets`, body);
  }

  public async place(table: Pick<Table, 'id' | 'nonce'>, target: number, amount: number): Promise<BetSubmissionResult> {
    const body = {
      kind: 'place',
      amount,
      target,
      table: table.id,
      nonce: table.nonce,
    };
    return this.post(`/bets`, body);
  }

  public async odds(table: Pick<Table, 'id' | 'nonce'>, target: number, amount: number): Promise<BetSubmissionResult> {
    const body = {
      kind: 'come-odds',
      amount,
      target,
      table: table.id,
      nonce: table.nonce,
    };
    return this.post(`/bets`, body);
  }

  public async bet(table: Pick<Table, 'id' | 'nonce'>, kind: string, amount: number): Promise<BetSubmissionResult> {
    const body = {
      kind,
      amount,
      table: table.id,
      nonce: table.nonce,
    };
    debug('placing "%s" for "%s"', kind, amount);
    return this.post(`/bets`, body);
  }
}

export default Stickbot;
