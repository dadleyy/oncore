import Component from '@glimmer/component';
import { action } from '@ember/object';
import { cancel, later } from '@ember/runloop';
import debugLogger from 'ember-debug-logger';

const debug = debugLogger('component:place-dropdown');

type Timeout = ReturnType<typeof later>;

type DropdownAPI = {
  actions: {
    open: () => void;
  };
}

type Args = {
  disabled: boolean;
  onSelect: (target: number) => void;
};

class PlaceDropdown extends Component<Args> {
  private keylist: Array<string> = [];
  private timeout?: Timeout;

  @action
  public watchkey(dropdown: DropdownAPI, event: KeyboardEvent): void {
    const { keylist, timeout } = this;

    if (timeout) {
      cancel(timeout);
    }

    this.keylist = [event.key, ...keylist];

    if (this.keylist.join(',') === 'i,b') {
      debug('current keylist "%j"', this.keylist);
      dropdown.actions.open();
    }

    this.timeout = later(() => this.keylist = [], 500);
  }
}

export default PlaceDropdown;
