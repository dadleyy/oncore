import * as Seidr from 'seidr';
import { dasherize } from '@ember/string';
import debugLogger from 'ember-debug-logger';
import * as Stickbot from 'oncore/services/stickbot';
import { CurrentSession } from 'oncore/services/session';
import * as maybeHelpers from 'oncore/utility/maybe-helpers';
import * as uuid from 'oncore/utility/uuid';

const debug = debugLogger('util:table-view.state');

export type ParsedBet = {
  state: Stickbot.Bet;
  kind: string;
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

export type FailedJob = {
  id: string;
  reason: string;
};

export type State = {
  busy: boolean;
  rollHistory: Array<ParsedRoll>;
  table: Stickbot.Table;
  playerPosition: Seidr.Maybe<Seat>;
  session: CurrentSession;
  pendingBets: Array<PendingJob>;
  pendingRoll: Seidr.Maybe<PendingJob>;
  failedBets: Array<FailedJob>;
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
    failedBets: [],
    pendingRoll: Seidr.Nothing(),
    busy: false,
    nonce: uuid.generate(),
  };
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

function getFailure(status: Stickbot.JobStatus): Seidr.Maybe<FailedJob> {
  return Seidr.Maybe.fromNullable(status.output).flatMap((output) =>
    output === 'BetProcessed' ? Seidr.Nothing() : Seidr.Just({ id: status.id, reason: output.BetFailed })
  );
}

function partitionJobs(
  partitions: [Array<PendingJob>, Array<FailedJob>],
  item: Stickbot.JobStatus
): [Array<PendingJob>, Array<FailedJob>] {
  const [pending, failed] = partitions;

  debug('checking job status "%s"', item.output);

  const failures = getFailure(item)
    .map((message) => [message, ...failed])
    .getOrElse(failed);

  return [pending.concat(item.output ? [] : item), failures];
}

export async function hydrate(stickbot: Stickbot.default, state: State): Promise<Seidr.Result<Error, State>> {
  const { pendingBets: jobs, pendingRoll: roll } = state;
  const start = await load(stickbot, state.table.id, state.session);
  const fetches = await Promise.all(jobs.map((job) => stickbot.job(job.id)));

  const [pendingBets, failedBets] = maybeHelpers
    .flatten(fetches.map((result) => result.toMaybe()))
    .reduce(partitionJobs, [[], []]);

  debug('found %s failed jobs', failedBets.length);

  const pendingRoll = (await maybeHelpers.asyncMap(roll, (job) => stickbot.job(job.id)))
    .flatMap((inner) => inner.toMaybe())
    .flatMap((status) => (status.output ? Seidr.Nothing() : Seidr.Just({ id: status.id })));

  return start.map((next) => ({
    ...next,
    pendingBets,
    pendingRoll,
    busy: state.busy,
    nonce: state.nonce,
    failedBets: [...state.failedBets, ...failedBets],
  }));
}

export function dismissBet(state: State, id: string): State {
  const failedBets = state.failedBets.filter((failure) => failure.id !== id);
  return {
    ...state,
    failedBets,
    nonce: uuid.generate(),
  };
}

export async function load(
  stickbot: Stickbot.default,
  id: string,
  session: CurrentSession
): Promise<Seidr.Result<Error, State>> {
  const result = await stickbot.table(id);
  return result.map(table => parseTable(table, session));
}
