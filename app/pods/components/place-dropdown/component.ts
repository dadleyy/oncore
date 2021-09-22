import Component from '@glimmer/component';

class PlaceDropdown extends Component<{
  disabled: boolean;
  onSelect: (target: number) => void;
}> {}

export default PlaceDropdown;
