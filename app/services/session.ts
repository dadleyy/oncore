import Service from '@ember/service';
import * as Seidr from 'seidr';
import debugLogger from 'ember-debug-logger';
import fetch from 'fetch';
import config from 'oncore/config/environment';

const debug = debugLogger('service:session');

export type CurrentSession = {
  id: string;
  nickname: string;
};

class Session extends Service {
  private _session: Seidr.Maybe<CurrentSession> = Seidr.Nothing();

  public get currentSession(): Seidr.Maybe<CurrentSession> {
    return this._session || Seidr.Nothing();
  }

  public async identify(): Promise<Seidr.Maybe<CurrentSession>> {
    const response = await fetch(`${config.apiUrl}/auth/identify`);

    if (response.status !== 200) {
      debug('no session found, received "%s"', response.status);
      return Seidr.Nothing();
    }

    try {
      const body = await response.json();
      this._session = Seidr.Just(body);
      return Seidr.Just(body);
    } catch (error) {
      debug('failed parsing identity - %s', error);
      return Seidr.Nothing();
    }
  }
}

export default Session;
