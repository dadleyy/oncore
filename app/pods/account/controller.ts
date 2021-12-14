import Controller from '@ember/controller';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import debugLogger from 'ember-debug-logger';
import Stickbot from 'oncore/services/stickbot';
import Session from 'oncore/services/session';
import RouterUtility from 'oncore/services/router-utility';

const debug = debugLogger('controller:account');

class AccountController extends Controller {
  @service
  public declare stickbot: Stickbot;

  @service
  public declare session: Session;

  @service
  public declare routerUtility: RouterUtility;

  @action
  public async deleteAccount(): Promise<void> {
    const { stickbot, session, routerUtility } = this;
    debug('deleting account');
    const result = await stickbot.deleteAccount();

    const success = result.caseOf({
      Ok: () => true,
      Err: error => {
        debug('account deletion failed - %s', error);
        window.alert('unable to delete account');
        return false;
      },
    });

    if (!success) {
      debug('unable to delete account');
      return;
    }

    await session.identify();
    routerUtility.transitionTo('login');
  }
}

export default AccountController;
