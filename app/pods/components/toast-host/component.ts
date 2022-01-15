import Component from '@glimmer/component';
import Toasts, { ToastHandle } from 'oncore/services/toasts';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { later } from '@ember/runloop';
import debugLogger from 'ember-debug-logger';

const debug = debugLogger('component:toast-host');

class ToastHostComponent extends Component {
  @service
  public declare toasts: Toasts;

  public get items(): Array<ToastHandle> {
    return this.toasts.items;
  }

  @action
  public scheduleRemoval(_element: unknown, id: string): void {
    debug('scheduling removal of toast "%s"', id);
    later(this, this.remove, id, 1500);
  }

  @action
  public removeNow(id: string): void {
    const { isDestroyed, toasts } = this;

    if (!isDestroyed) {
      toasts.remove(id);
    }
  }

  private remove([id]: [string]): void {
    const { isDestroyed, toasts } = this;

    if (isDestroyed) {
      return;
    }

    debug('removing toast "%s"', id);
    toasts.remove(id);
  }
}

export default ToastHostComponent;
