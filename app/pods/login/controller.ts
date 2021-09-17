import Controller from '@ember/controller';
import config from 'oncore/config/environment';

class LoginController extends Controller {
  public loginUrl = config.externalRoutes.auth.start;
}

export default LoginController;
