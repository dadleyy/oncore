import Component from '@glimmer/component';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import Modals, { modalKey } from 'oncore/services/modals';
import * as Seidr from 'seidr';

export const KEY = modalKey<unknown, Seidr.Maybe<number>>('wager-input-modal');

class WagerInputModal extends Component {
  public key = KEY;

  @service
  public declare modals: Modals;

  @tracked
  public wager?: string;

  public get valid(): Seidr.Maybe<number> {
    const { wager } = this;
    const parsed = wager ? parseInt(wager, 10) : NaN;
    return isNaN(parsed) === false ? Seidr.Just(parsed) : Seidr.Nothing();
  }

  @action
  public submit(event: KeyboardEvent): void {
    const { key, modals, valid: wager } = this;
    const { keyCode } = event;

    if (keyCode === 27) {
      modals.close(key, Seidr.Nothing());
      return;
    }

    if (keyCode !== 13) {
      return;
    }

    this.wager = undefined;
    modals.close(key, Seidr.Just(wager));
  }

  @action
  public input(event: InputEvent): void {
    const target = event.target as HTMLInputElement;
    this.wager = target.value;
  }

  @action
  public focus(element: HTMLInputElement): void {
    element.focus();
  }
}

export default WagerInputModal;
