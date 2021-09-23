import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import Modals from 'oncore/services/modals';
import * as Seidr from 'seidr';
import debugLogger from 'ember-debug-logger';

const debug = debugLogger('component:modal');

export type Args = {
  key: string;
  onClose: () => void;
};

class Modal extends Component<Args> {
  @service
  public declare modals: Modals;

  public get active(): boolean {
    const { modals } = this;
    return modals.active.map((id) => id === this.args.key).getOrElse(false);
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
