import * as Seidr from 'seidr';
import debugLogger from 'ember-debug-logger';
import * as Stickbot from 'oncore/services/stickbot-tables';
import * as StickbotError from 'oncore/stickbot/stickbot-error';
import * as StickbotBets from 'oncore/stickbot/stickbot-bet';
import * as Jobs from 'oncore/services/stickbot-jobs';
import { CurrentSession } from 'oncore/services/session';
import * as maybeHelpers from 'oncore/utility/maybe-helpers';
import * as uuid from 'oncore/utility/uuid';

const debug = debugLogger('util:table-view.state');

export type Seat = {
  id: string;
  nickname: string;
  state: Stickbot.Seat;
  balance: number;
  hasPass: boolean;
  bets: Array<StickbotBets.PlacedBed>;
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
  selectedSeat: Seidr.Maybe<Seat>;
  seats: Array<Seat>;
  rollHistory: Array<ParsedRoll>;
  table: Stickbot.TableDetails;
  playerPosition: Seidr.Maybe<Seat>;
  session: CurrentSession;
  pendingBets: Array<PendingJob>;
  pendingRoll: Seidr.Maybe<PendingJob>;
  failedBets: Array<FailedJob>;
  nonce: string;
};

function mapSeat(input: Stickbot.Seat): Seat {
  return {
    ...input,
    state: input,
    hasPass: false,
    comeOddsOptions: [],
  };
}

function parse(table: Stickbot.TableDetails, session: CurrentSession): State {
  const mappedSeats = table.seats.map(mapSeat);
  const player = mappedSeats.find((s) => s.id === session.id);
  const playerPosition = Seidr.Maybe.fromNullable(player);
  const rollHistory = table.rolls.map(([left, right]) => ({
    left,
    right,
    total: left + right,
  }));

  const selectedSeat = playerPosition
    .map((seat) => ({ ...seat, id: session.id }))
    .orElse(() => Seidr.Maybe.fromNullable(mappedSeats[0]));

  return {
    table,
    playerPosition,
    rollHistory,
    session,
    seats: mappedSeats,
    selectedSeat,
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

function partitionJobs(
  partitions: [Array<PendingJob>, Array<FailedJob>],
  item: Jobs.JobStatus
): [Array<PendingJob>, Array<FailedJob>] {
  const [pending, failed] = partitions;

  debug('checking job status "%s"', item.output);

  const failures = Jobs.getFailureTranslation(item)
    .map((reason) => [{ id: item.id, reason }, ...failed])
    .getOrElse(failed);

  return [pending.concat(item.output ? [] : item), failures];
}

export async function hydrate(
  stickbot: Stickbot.default,
  jobs: Jobs.default,
  state: State
): Promise<Seidr.Result<StickbotError.default, State>> {
  const { pendingBets: betQueue, pendingRoll: roll } = state;
  const start = await load(stickbot, state.table.id, state.session);
  const fetches = await Promise.all(betQueue.map((job) => jobs.find(job.id)));

  const [pendingBets, failedBets] = maybeHelpers
    .flatten(fetches.map((result) => result.toMaybe()))
    .reduce(partitionJobs, [[], []]);

  debug('found %s failed jobs', failedBets.length);

  const pendingRoll = (await maybeHelpers.asyncMap(roll, (job) => jobs.find(job.id)))
    .flatMap((inner) => inner.toMaybe())
    .flatMap((status) => (status.output ? Seidr.Nothing() : Seidr.Just({ id: status.id })));

  return start.map((next) => {
    const selectedSeat = state.selectedSeat
      .flatMap(({ id }) => Seidr.Maybe.fromNullable(next.seats.find((s) => s.id === id) || next.seats[0]))
      .orElse(() => next.selectedSeat);

    return {
      ...next,
      pendingBets,
      pendingRoll,
      selectedSeat,
      busy: state.busy,
      nonce: state.nonce,
      failedBets: [...state.failedBets, ...failedBets],
    };
  });
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
): Promise<Seidr.Result<StickbotError.default, State>> {
  const result = await stickbot.find(id);
  return result.map((table) => parse(table, session));
}

export function isRoller(state: State): boolean {
  return state.table.roller === state.session.id;
}

export function setActiveSeat(state: State, id: string): State {
  const selectedSeat = Seidr.Maybe.fromNullable(state.seats.find((s) => s.id === id));
  return {
    ...state,
    selectedSeat,
    nonce: uuid.generate(),
  };
}
