import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import * as Seidr from 'seidr';
import debugLogger from 'ember-debug-logger';
import fetch from 'fetch';
import config from 'oncore/config/environment';
import * as promises from 'oncore/utility/promise-helpers';

const debug = debugLogger('service:session');

export type CurrentSession = {
  id: string;
  nickname: string;
  balance: number;
};

class Session extends Service {
  private _session: Seidr.Maybe<CurrentSession> = Seidr.Nothing();

  @tracked
  public balance = 0;

  public get currentSession(): Seidr.Maybe<CurrentSession> {
    return this._session || Seidr.Nothing();
  }

  public async identify(): Promise<Seidr.Maybe<CurrentSession>> {
    const res = await promises.awaitResult(fetch(`${config.apiUrl}/auth/identify`));
    const response = res.getOrElse(undefined);

    if (!response) {
      debug('[warning] fatal network fail on session fetch');
      return Seidr.Nothing();
    }

    if (response.status !== 200) {
      this.balance = 0;
      debug('no session found, received "%s"', response.status);
      return Seidr.Nothing();
    }

    try {
      const body = await response.json();
      this.balance = body.balance;
      this._session = Seidr.Just(body);
      return Seidr.Just(body);
    } catch (error) {
      this.balance = 0;
      debug('failed parsing identity - %s', error);
      return Seidr.Nothing();
    }
  }
}

export default Session;
