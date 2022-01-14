import Service from '@ember/service';
import SumType from 'sums-up';
import { inject as service } from '@ember/service';
import * as Stickbot from 'oncore/services/stickbot';
import * as StickbotError from 'oncore/stickbot/stickbot-error';
import * as Seidr from 'seidr';
import debugLogger from 'ember-debug-logger';

const debug = debugLogger('service:stickbot-jobs');

export const JOB_CONSTANTS = {
  ROLL_PROCESED: 'roll_processed',
  TABLE_CREATED: 'table_created',
  BET_FAILED: 'bet_failed',
  BET_PROCESSED: 'bet_processed',
};

export type JobOutputVariants = {
  RollProcessed: [];
  TableCreated: [string];
  BetFailure: [string];
  BetProcessed: [];
};

export class JobOutput extends SumType<JobOutputVariants> {}

export function BetProcessed(): JobOutput {
  return new JobOutput('BetProcessed');
}

export function RollProcessed(): JobOutput {
  return new JobOutput('RollProcessed');
}

export function TableCreated(id: string): JobOutput {
  return new JobOutput('TableCreated', id);
}

export function BetFailure(reason: string): JobOutput {
  return new JobOutput('BetFailure', reason);
}

export type CreatedJobHandle = {
  job: string;
};

export type JobStatus = {
  id: string;
  completed?: string;
  output?: JobOutput;
};

export function getCreatedTableId(job: JobStatus): Seidr.Maybe<string> {
  const output = Seidr.Maybe.fromNullable(job.output);
  return output.flatMap((out) => {
    return out.caseOf({
      BetFailure: Seidr.Nothing,
      BetProcessed: Seidr.Nothing,
      RollProcessed: Seidr.Nothing,
      TableCreated: (id) => Seidr.Just(id),
    });
  });
}

export function getFailureTranslation(job: JobStatus): Seidr.Maybe<string> {
  const output = Seidr.Maybe.fromNullable(job.output);
  return output.flatMap((out) => {
    return out.caseOf({
      BetFailure: (reason) => Seidr.Just(`stickbot_errors.bet_failure.${reason}`),
      RollProcessed: Seidr.Nothing,
      BetProcessed: Seidr.Nothing,
      TableCreated: Seidr.Nothing,
    });
  });
}

export type JobResponse = {
  id: string;
  completed?: string;
  output?: Record<string, string> | string;
};

function parseResponse(res: JobResponse): JobStatus {
  const { output } = res;

  if (!output) {
    return { ...res, output: undefined };
  }

  if (typeof output === 'string' && output === JOB_CONSTANTS.ROLL_PROCESED) {
    return {
      ...res,
      output: RollProcessed(),
    };
  }

  if (typeof output === 'string' && output === JOB_CONSTANTS.BET_PROCESSED) {
    return {
      ...res,
      output: BetProcessed(),
    };
  }

  if (typeof output === 'string') {
    return {
      ...res,
      output: undefined,
    };
  }

  if (output[JOB_CONSTANTS.TABLE_CREATED]) {
    return {
      ...res,
      output: TableCreated(output[JOB_CONSTANTS.TABLE_CREATED]),
    };
  }

  if (output[JOB_CONSTANTS.BET_FAILED]) {
    return {
      ...res,
      output: BetFailure(output[JOB_CONSTANTS.BET_FAILED]),
    };
  }

  return {
    ...res,
    output: undefined,
  };
}

class StickbotJobs extends Service {
  @service
  public declare stickbot: Stickbot.default;

  public async find(id: string): Promise<Seidr.Result<StickbotError.default, JobStatus>> {
    const { stickbot } = this;
    debug('fetching job "%s"', id);
    const payload = await stickbot.fetch(`/job?id=${id}`);
    return payload.map(parseResponse);
  }
}

export default StickbotJobs;
