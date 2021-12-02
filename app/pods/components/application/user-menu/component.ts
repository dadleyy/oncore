import Component from '@glimmer/component';
import * as Seidr from 'seidr';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import type SessionService from 'oncore/services/session';
import config from 'oncore/config/environment';
import fetchApi from 'fetch';
import debugLogger from 'ember-debug-logger';

const debug = debugLogger('component:application/user-menu');

class UserMenu extends Component {
  public tagName = '';

  @service
  public session!: SessionService;

  public get isAdmin(): boolean {
    return true;
  }

  public get user(): Seidr.Maybe<{ nickname: string; balance: number }> {
    const { session } = this;
    return session.currentSession.map((info) => ({
      balance: session.balance,
      nickname: info.nickname,
    }));
  }

  @action
  public async setBalance(): Promise<void> {
    debug('admin setting user balance');
    await fetchApi(`${config.apiUrl}/admin/set-balance?amount=5000`, { method: 'GET' });
  }
}

export default UserMenu;
