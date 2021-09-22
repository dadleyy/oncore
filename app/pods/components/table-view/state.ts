import * as Seidr from 'seidr';
import { dasherize } from '@ember/string';
import debugLogger from 'ember-debug-logger';
import * as Stickbot from 'oncore/services/stickbot';
import { CurrentSession } from 'oncore/services/session';
import * as maybeHelpers from 'oncore/utility/maybe-helpers';
import * as uuid from 'oncore/utility/uuid';

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

export type ParsedRoll = {
  left: number;
  right: number;
  total: number;
};

export type PendingJob = {
  id: string;
};

export type State = {
  busy: boolean;
  rollHistory: Array<ParsedRoll>;
  table: Stickbot.Table;
  playerPosition: Seidr.Maybe<Seat>;
  session: CurrentSession;
  pendingBets: Array<PendingJob>;
  pendingRoll: Seidr.Maybe<PendingJob>;
  nonce: string;
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

  if (input.field) {
    return { kind: 'field', amount: input.field, state: input, target: null };
  }

  debug('unrecognized bet payload "%j"', input);
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

function parseTable(table: Stickbot.Table, session: CurrentSession): State {
  const player = table.seats[session.id];
  const playerPosition = Seidr.Maybe.fromNullable(player).map(parseSeat);
  const rollHistory = table.rolls.map(([left, right]) => ({
    left,
    right,
    total: left + right,
  }));

  return {
    table,
    playerPosition,
    rollHistory,
    session,
    pendingBets: [],
    pendingRoll: Seidr.Nothing(),
    busy: false,
    nonce: uuid.generate(),
  };
}

export function fromTables(
  id: string,
  tables: Array<Stickbot.Table>,
  session: CurrentSession
): Seidr.Result<Error, State> {
  const maybeTable = Seidr.Maybe.fromNullable(tables.find((t) => t.id === id));
  const model = maybeTable.map((table) => parseTable(table, session));
  return maybeHelpers.orErr(new Error('not-found'), model);
}

export function setPendingRoll(state: State, job: PendingJob): State {
  return {
    ...state,
    pendingRoll: Seidr.Just(job),
    nonce: uuid.generate(),
  };
}

export function addPendingBet(state: State, job: PendingJob): State {
  return {
    ...state,
    pendingBets: [job, ...state.pendingBets],
    nonce: uuid.generate(),
  };
}

export function makeBusy(state: State, busy = true): State {
  return { ...state, busy };
}

export async function hydrate(stickbot: Stickbot.default, state: State): Promise<Seidr.Result<Error, State>> {
  const { pendingBets: jobs, pendingRoll: roll } = state;
  const start = await load(stickbot, state.table.id, state.session);
  const fetches = await Promise.all(jobs.map((job) => stickbot.job(job.id)));

  const pendingBets = maybeHelpers
    .flatten(fetches.map((result) => result.toMaybe()))
    .filter((status) => !status.output);

  const pendingRoll = (await maybeHelpers.asyncMap(roll, (job) => stickbot.job(job.id)))
    .flatMap((inner) => inner.toMaybe())
    .flatMap((status) => (status.output ? Seidr.Nothing() : Seidr.Just({ id: status.id })));

  debug('finished reloading (busy "%s")', state.busy);
  return start.map((next) => ({
    ...next,
    pendingBets,
    pendingRoll,
    busy: state.busy,
    nonce: state.nonce,
  }));
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
