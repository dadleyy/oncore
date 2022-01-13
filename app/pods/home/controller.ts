import Controller from '@ember/controller';
import * as Seidr from 'seidr';
import type SessionService from 'oncore/services/session';
import type RouterUtils from 'oncore/services/router-utility';
import * as maybeHelpers from 'oncore/utility/maybe-helpers';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { later, cancel } from '@ember/runloop';
import { EmberRunTimer } from '@ember/runloop/types';
import * as State from 'oncore/pods/home/state';
import { inject as service } from '@ember/service';
import debugLogger from 'ember-debug-logger';
import * as StickbotTables from 'oncore/services/stickbot-tables';
import * as StickbotJobs from 'oncore/services/stickbot-jobs';
import * as StickbotTableMembership from 'oncore/services/stickbot-table-membership';
import Toasts, { StickbotFailure, SimpleWarning } from 'oncore/services/toasts';

const debug = debugLogger('controller:home');

type PendingJob = {
  id: string;
  table: string;
  kind: 'JOINING' | 'LEAVING';
};

class HomeController extends Controller {
  public declare model: State.ModelResult;

  @tracked
  public jobs: Array<PendingJob> = [];

  @tracked
  public _poll?: { id: EmberRunTimer };

  @service
  public declare stickbotTables: StickbotTables.default;

  @service
  public declare toasts: Toasts;

  @service
  public declare stickbotTableMembership: StickbotTableMembership.default;

  @service
  public declare stickbotJobs: StickbotJobs.default;

  @service
  public declare session: SessionService;

  @service
  public routerUtility!: RouterUtils;

  public get displayedTableRows(): Array<State.Row> {
    const { model: result, jobs } = this;
    const rows = result.map((model) => model.rows).getOrElse([]);
    return rows.map((row) => {
      const job = Seidr.Maybe.fromNullable(jobs.find((j) => j.table === row.table.id));

      return {
        ...row,
        busy: job.map((j) => j.kind).getOrElse(undefined),
      };
    });
  }

  @action
  public async leaveTable(tableId: string): Promise<void> {
    const { stickbotTableMembership: stickbot, toasts } = this;
    debug('attempting to leave table - "%s"', tableId);
    const jobResult = await stickbot.leave(tableId);
    jobResult.caseOf({
      Ok: (jobId) => {
        const jobs = [{ id: jobId, table: tableId, kind: 'LEAVING' as State.RowOperation }, ...this.jobs];
        if (this._poll) {
          cancel(this._poll.id);
        }
        this.jobs = jobs;
        this.poll(this.jobs);
      },
      Err: (error) => {
        debug('table departure failed - %o', error);
        toasts.add(StickbotFailure(error));
      },
    });
  }

  @action
  public async joinTable(tableId: string): Promise<void> {
    const { stickbotTableMembership: stickbot, toasts } = this;
    const jobResult = await stickbot.join(tableId);
    jobResult.caseOf({
      Ok: (jobId) => {
        debug('joining table - "%s" via job "%s"', tableId, jobId);
        const jobs = [{ id: jobId, table: tableId, kind: 'JOINING' as State.RowOperation }, ...this.jobs];
        if (this._poll) {
          cancel(this._poll.id);
        }
        this.jobs = jobs;
        this.poll(this.jobs);
      },
      Err: (error) => {
        debug('unable to queue seating - %o', error);
        toasts.add(StickbotFailure(error));
      },
    });
  }

  @action
  public async createTable(): Promise<void> {
    const { stickbotTables: stickbot, routerUtility: router } = this;
    const tableId = (await stickbot.create()).getOrElse(undefined);

    if (!tableId) {
      debug('failed creating new table');
      alert('Unable to create new table');
      return;
    }

    debug('created new table "%j"', tableId);
    router.transitionTo('tables.single-table', tableId);
    return;
  }

  @action
  public stopPolling(): void {
    const { _poll: cursor } = this;

    if (cursor) {
      debug('ending job poll');
      cancel(cursor.id);
    }
  }

  private async poll(jobs: Array<PendingJob>): Promise<void> {
    const { toasts, stickbotJobs, routerUtility, session } = this;

    if (!jobs.length) {
      debug('nothing to poll, skipping');
      this._poll = { id: later(this, this.poll, [], 1000) };
      return;
    }

    debug('attempting poll');
    const results = await Promise.all(jobs.map(({ id }) => stickbotJobs.find(id)));
    const pending = results.map((result) => {
      return result.caseOf({
        Err: (error) => {
          debug('unable to fetch job "%s"', error);
          toasts.add(SimpleWarning('stickbot_error.bad_job'));
          return Seidr.Nothing();
        },
        Ok: (response) => {
          const original = Seidr.Maybe.fromNullable(jobs.find(({ id }) => id === response.id));
          return original.flatMap((job) => {
            if (!response.completed) {
              return Seidr.Just(job);
            }

            switch (job.kind) {
              case 'JOINING':
                debug('join attempt "%s" complete', job.id);
                routerUtility.transitionTo('tables.single-table', job.table).then(() => session.identify());
                return Seidr.Nothing();
              case 'LEAVING':
                debug('stand attempt "%s" complete', job.id);
                routerUtility.refresh().then(() => session.identify());
                return Seidr.Nothing();
            }
          });
        },
      });
    });

    this._poll = { id: later(this, this.poll, maybeHelpers.flatten(pending), 1000) };
  }
}

export default HomeController;
