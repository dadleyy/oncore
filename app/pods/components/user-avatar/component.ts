import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import config from 'oncore/config/environment';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { run } from '@ember/runloop';
import Session from 'oncore/services/session';
import debugLogger from 'ember-debug-logger';

const debug = debugLogger('component:user-avatar');

export type UserInfo = {
  id: string;
  nickname: string;
};

class UserAvatar extends Component<{ user: UserInfo }> {
  @tracked
  public loadedImage?: string;

  @service
  public declare session: Session;

  public get isActive(): boolean {
    const { session } = this;
    const { user } = this.args;
    return session.currentSession.map((ses) => ses.id === user?.id).getOrElse(false);
  }

  public get initial(): string {
    const { user } = this.args;
    return user.nickname.charAt(0).toUpperCase();
  }

  @action
  public async loadAvatar(): Promise<void> {
    const qualifiedURL = `${config.avatarURL}?id=${this.args.user.id}`;
    debug('attempting to load user avatar at %s', qualifiedURL);
    const image = new Image();
    image.src = qualifiedURL;
    image.onload = () => run(() => (this.loadedImage = qualifiedURL));
    image.onerror = function (error) {
      debug('[warning] failed load, %s', error);
    };
  }
}

export default UserAvatar;
