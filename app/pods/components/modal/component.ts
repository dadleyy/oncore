import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import Modals, { ModalActivationKey } from 'oncore/services/modals';
import * as Seidr from 'seidr';
import debugLogger from 'ember-debug-logger';

const debug = debugLogger('component:modal');

export type Args<P, R> = {
  key: ModalActivationKey<P, R>;
  onClose: () => void;
};

class Modal<P, R> extends Component<Args<P, R>> {
  @service
  public declare modals: Modals;

  public get active(): Seidr.Maybe<P> {
    const { modals } = this;
    return modals.lock(this.args.key);
  }

  @action
  public input(event: KeyboardEvent): void {
    const { keyCode } = event;

    if (keyCode !== 27) {
      debug('ignoring key press "%s"', keyCode);
      return;
    }

    debug('closing modal "%s"', this.args.key);
    this.modals.close(this.args.key, Seidr.Nothing());
  }
}

export default Modal;
