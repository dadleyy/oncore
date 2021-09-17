import Controller from '@ember/controller';
import debugLogger from 'ember-debug-logger';

const debug = debugLogger('controller:home');

class HomeController extends Controller {
  public async joinTable(): Promise<void> {
    debug('joining table');
  }
}

export default HomeController;
