import * as Seidr from 'seidr';
import { dasherize } from '@ember/string';
import debugLogger from 'ember-debug-logger';
import * as Stickbot from 'oncore/services/stickbot';
import { CurrentSession } from 'oncore/services/session';
import * as helpers from 'oncore/utility/maybe-helpers';

const debug = debugLogger('util:table-view.state');

export type ParsedBet = {
  kind: string;
  state: Stickbot.Bet;
  amount: number;
  target: number | null;
};

export type Seat = {
  state: Stickbot.Seat;
  balance: number;
  hasPass: boolean;
  bets: Array<ParsedBet>;
  comeOddsOptions: Array<number>;
};

export type State = {
  table: Stickbot.Table;
  playerPosition: Seidr.Maybe<Seat>;
};

function parseBet(input: Stickbot.Bet): ParsedBet {
  if (input.race) {
    const [kind, amount, target] = input.race;
    return { kind: dasherize(kind), amount, target, state: input };
  }

  if (input.target) {
    const [kind, amount, target] = input.target;
    return { kind: dasherize(kind), amount, target, state: input };
  }

  return { kind: '', state: input, amount: 0, target: null };
}

function parseSeat(input: Stickbot.Seat): Seat {
  const bets = input.bets.map(parseBet);

  return {
    bets,
    state: input,
    balance: input.balance,
    comeOddsOptions: bets
      .filter((b) => b.kind === 'come')
      .reduce((acc, b) => (b.target ? [...acc, b.target] : acc), []),
    hasPass: bets.some((bet) => dasherize(bet.kind) === 'pass'),
  };
}

export function fromTables(
  id: string,
  tables: Array<Stickbot.Table>,
  session: CurrentSession
): Seidr.Result<Error, State> {
  const maybeTable = Seidr.Maybe.fromNullable(tables.find((t) => t.id === id));

  const model = maybeTable.map((table) => {
    const player = table.seats[session.id];
    const playerPosition = Seidr.Maybe.fromNullable(player).map(parseSeat);
    return { table, playerPosition };
  });

  return helpers.orErr(new Error('not-found'), model);
}

export async function load(
  stickbot: Stickbot.default,
  id: string,
  session: CurrentSession
): Promise<Seidr.Result<Error, State>> {
  debug('loading state from server for "%s"', id);
  const result = await stickbot.tables();
  return result.flatMap((tables) => fromTables(id, tables, session));
}
