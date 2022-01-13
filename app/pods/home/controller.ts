import Controller from '@ember/controller';
import * as Seidr from 'seidr';
import type SessionService from 'oncore/services/session';
import type RouterUtils from 'oncore/services/router-utility';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { later, cancel } from '@ember/runloop';
import { EmberRunTimer } from '@ember/runloop/types';
import * as State from 'oncore/pods/home/state';
import { yes } from 'oncore/utility/fp-helpers';
import { inject as service } from '@ember/service';
import debugLogger from 'ember-debug-logger';
import * as StickbotTables from 'oncore/services/stickbot-tables';
import * as StickbotJobs from 'oncore/services/stickbot-jobs';
import * as StickbotTableMembership from 'oncore/services/stickbot-table-membership';
import Toasts, { StickbotFailure, SimpleWarning } from 'oncore/services/toasts';

const debug = debugLogger('controller:home');

class HomeController extends Controller {
  public declare model: State.ModelResult;

  @tracked
  public jobs: Array<{ id: string; table: string; kind: 'JOINING' | 'LEAVING' }> = [];

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
        busy: job.map(yes).getOrElse(false),
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
        const jobs = [{ id: jobId, table: tableId, kind: 'LEAVING' }, ...this.jobs];
        this.jobs = jobs;
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
    debug('joining table - "%s"', tableId);
    const jobResult = await stickbot.join(tableId);
    jobResult.caseOf({
      Ok: (jobId) => {
        const jobs = [{ id: jobId, table: tableId, kind: 'JOINING' }, ...this.jobs];
        this.jobs = jobs;
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

  @action
  public pollJobs(): void {
    debug('starting job poll');
    this.poll();
  }

  private async poll(): Promise<void> {
    const { toasts, jobs, stickbotJobs, routerUtility } = this;

    if (!jobs.length) {
      debug('nothing to poll, skipping');
      this._poll = { id: later(this, this.poll, 1000) };
      return;
    }

    debug('attempting poll');
    const results = await Promise.all(jobs.map(({ id }) => stickbotJobs.find(id)));
    const pending = jobs.slice(0, 0);

    for (let i = 0; i < results.length; i++) {
      const result = results[i];

      const leaving = result.caseOf({
        Err: (error) => {
          debug('unable to fetch job "%s"', error);
          toasts.add(SimpleWarning('stickbot_error.bad_job'));
          return false;
        },
        Ok: (response) => {
          const original = jobs.find(({ id }) => id === response.id);

          if (!original) {
            return false;
          }

          if (!response.completed) {
            debug('job "%s" not complete, preparing for next poll', response.id);
            pending.push(original);
            return false;
          }

          switch (original.kind) {
            case 'LEAVING':
              debug('finished leaving table "%s"', original.table);
              routerUtility.refresh();
              return true;
            case 'JOINING':
              debug('finished joining table "%s"', original.table);
              routerUtility.transitionTo('tables.single-table', original.table);
              return true;
          }
        },
      });

      if (leaving) {
        return;
      }
    }

    this.jobs = pending;
    this._poll = { id: later(this, this.poll, 1000) };
  }
}

export default HomeController;
