import Service from '@ember/service';
import { inject as service } from '@ember/service';
import * as Stickbot from 'oncore/services/stickbot';
import * as StickbotError from 'oncore/stickbot/stickbot-error';
import * as Seidr from 'seidr';
import debugLogger from 'ember-debug-logger';

const debug = debugLogger('service:stickbot-jobs');

type BetFailed = {
  BetFailed: string;
};

export type CreatedJobHandle = {
  job: string;
};

export type JobStatus = {
  id: string;
  completed?: string;
  output?: 'BetProcessed' | BetFailed;
};

class StickbotJobs extends Service {
  @service
  public declare stickbot: Stickbot.default;

  public async find(id: string): Promise<Seidr.Result<StickbotError.default, JobStatus>> {
    const { stickbot } = this;
    debug('fetching job "%s"', id);
    return await stickbot.fetch(`/job?id=${id}`);
  }
}

export default StickbotJobs;
