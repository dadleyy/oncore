import Controller from '@ember/controller';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import debugLogger from 'ember-debug-logger';
import config from 'oncore/config/environment';
import Stickbot from 'oncore/services/stickbot';
import Session from 'oncore/services/session';

const debug = debugLogger('controller:account');

class AccountController extends Controller {
  @service
  public declare stickbot: Stickbot;

  @service
  public declare session: Session;

  @action
  public async deleteAccount(): Promise<void> {
    const { stickbot } = this;
    debug('deleting account');
    const result = await stickbot.deleteAccount();

    const success = result.caseOf({
      Ok: () => true,
      Err: (error) => {
        debug('account deletion failed - %s', error);
        window.alert('unable to delete account');
        return false;
      },
    });

    if (!success) {
      debug('unable to delete account');
      return;
    }

    debug('account deletion success, clearing session');
    window.location.href = config.externalRoutes.auth.logout;
  }
}

export default AccountController;
