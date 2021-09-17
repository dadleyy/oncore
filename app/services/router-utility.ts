import Service from '@ember/service';
import type RouterService from '@ember/routing/router-service';
import { inject as service } from '@ember/service';
import debugLogger from 'ember-debug-logger';

const debug = debugLogger('service:router-utility');

type Transition = ReturnType<RouterService['transitionTo']>;

class RouterUtils extends Service {
  @service
  public router!: RouterService;

  public get routeName(): string {
    return this.router.currentRouteName;
  }

  public transitionTo(
    destination: string,
    ...other: Array<unknown>
  ): Transition {
    const { router } = this;
    return router.transitionTo.call(router, destination, ...other);
  }

  // TODO: https://github.com/emberjs/rfcs/blob/master/text/0631-refresh-method-for-router-service.md
  public refresh(name?: string): void {
    const { router } = this;
    debug('attempting to refresh "%s"', name);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    // eslint-disable-next-line ember/no-private-routing-service
    const info = router._router._routerMicrolib.state.routeInfos.find(
      (info) => info.name === name
    );

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    // eslint-disable-next-line ember/no-private-routing-service
    router._router._routerMicrolib.refresh(info ? info.route : undefined);
  }
}

export default RouterUtils;
