import Component from '@glimmer/component';
import * as Seidr from 'seidr';
import { inject as service } from '@ember/service';
import type SessionService from 'oncore/services/session';
import config from 'oncore/config/environment';

class UserMenu extends Component {
  public tagName = '';

  @service
  public session!: SessionService;

  public get logoutURL(): string {
    return config.externalRoutes.auth.logout;
  }

  public get user(): Seidr.Maybe<{ nickname: string; balance: number }> {
    const { session } = this;
    return session.currentSession.map((info) => ({
      balance: session.balance,
      nickname: info.nickname,
    }));
  }
}

export default UserMenu;
