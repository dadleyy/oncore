import Service from '@ember/service';
import SumType from 'sums-up';
import { inject as service } from '@ember/service';
import * as Stickbot from 'oncore/services/stickbot';
import * as StickbotError from 'oncore/stickbot/stickbot-error';
import * as Seidr from 'seidr';
import debugLogger from 'ember-debug-logger';

const debug = debugLogger('service:stickbot-jobs');

export type JobOutputVariants = {
  BetFailure: [string];
  BetProcessed: [];
};

export class JobOutput extends SumType<JobOutputVariants> {}

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

export function getFailureTranslation(job: JobStatus): Seidr.Maybe<string> {
  const output = Seidr.Maybe.fromNullable(job.output);
  return output.flatMap((out) => {
    return out.caseOf({
      BetFailure: (reason) => Seidr.Just(`stickbot_errors.bet_failure.${reason}`),
      BetProcessed: () => Seidr.Nothing(),
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

  if (typeof output === 'string') {
    return {
      ...res,
      output: undefined,
    };
  }

  if (output['bet_failed']) {
    return {
      ...res,
      output: BetFailure(output['bet_failed']),
    };
  }

  console.log({ output });

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
