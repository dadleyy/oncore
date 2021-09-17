import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import type RouterService from '@ember/routing/router-service';

class NotFound extends Route {
  @service
  public router!: RouterService;

  public afterModel(): void {
    const { router } = this;
    router.transitionTo('home');
  }
}

export default NotFound;
