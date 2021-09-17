import Service from '@ember/service';
import type RouterService from '@ember/routing/router-service';
import { inject as service } from '@ember/service';
import { readOnly } from '@ember/object/computed';
import debugLogger from 'ember-debug-logger';

const debug = debugLogger('service:router-utility');

class RouterUtils extends Service {
  @service
  public router!: RouterService;

  @readOnly('router.currentRouteName')
  public routeName!: string;

  // TODO: https://github.com/emberjs/rfcs/blob/master/text/0631-refresh-method-for-router-service.md
  public refresh(name?: string): void {
    const { router } = this;
    debug('attempting to refresh "%s"', name);

    // @ts-ignore
    const info = router._router._routerMicrolib.state.routeInfos.find(info => info.name === name);
    // @ts-ignore
    router._router._routerMicrolib.refresh(info ? info.route : undefined);
  }
}

export default RouterUtils;
