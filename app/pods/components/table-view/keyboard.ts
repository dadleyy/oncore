import * as Seidr from 'seidr';
import debugLogger from 'ember-debug-logger';

const debug = debugLogger('utility:table-view.keyboard');

export type Timer = ReturnType<typeof setTimeout>;

type ComeKeyCommand = { type: "come" };
type PassOddsKeyCommand = { type: "pass-odds" };
type PassKeyCommand = { type: "pass" };
type FieldKeyCommand = { type: "field" };
type PlaceKeyCommand = { type: "place", target: number };
type KeyCommand = ComeKeyCommand | PassOddsKeyCommand | PassKeyCommand | FieldKeyCommand | PlaceKeyCommand;

export type Keyboard = {
  sequence: Array<string>;
  id?: Timer;
};

export function parse(keyboard: Keyboard): Seidr.Maybe<KeyCommand> {
  const [first, second, third] = keyboard.sequence;

  debug('checking current sequence "%s" "%s" "%s"', first, second, third);

  if (first === 'b' && second === 'c') {
    debug('found come bet command');
    return Seidr.Just({ type: "come" });
  }

  if (first === 'b' && second === 'p') {
    return Seidr.Just({ type: "pass" });
  }

  if (first === 'b' && second === 'f') {
    return Seidr.Just({ type: "field" });
  }

  if (first === 'b' && second === 'o') {
    return Seidr.Just({ type: "pass-odds" });
  }

  if (first === 'b' && second === 't') {
    debug('place bet sequence recognized, checking third "%s"', third);

    switch (third) {
      case '4':
        debug('valid place bet on 4');
        return Seidr.Just({ type: "place", target: 4 });
      default:
        debug('unrecognized third key "%s"', third);
    }
  }

  return Seidr.Nothing();
}

export function apply(keyboard: Keyboard, key: string): Keyboard {
  return { ...keyboard, sequence: keyboard.sequence.concat(key) };
}

export function empty(): Keyboard {
  return { sequence: [] };
}
