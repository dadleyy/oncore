import Component from '@glimmer/component';

class HardwayDropdown extends Component<{
  disabled: boolean;
  onSelect: (target: number) => void;
}> {}

export default HardwayDropdown;
