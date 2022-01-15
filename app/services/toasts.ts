import Service from '@ember/service';
import SumType from 'sums-up';
import { generate as uuid } from 'oncore/utility/uuid';
import { identity, always } from 'oncore/utility/fp-helpers';
import { tracked } from '@glimmer/tracking';
import debugLogger from 'ember-debug-logger';
import * as StickbotError from 'oncore/stickbot/stickbot-error';

const debug = debugLogger('service:toasts');

export type ToastVariants = {
  SimpleWarning: [string];
  StickbotFailure: [StickbotError.default];
};

class Toast extends SumType<ToastVariants> {}

export function StickbotFailure(error: StickbotError.default): Toast {
  return new Toast('StickbotFailure', error);
}

export function SimpleWarning(warning: string): Toast {
  return new Toast('SimpleWarning', warning);
}

export type ToastHandle = {
  toast: Toast;
  id: string;
  treatment: string;
  translation: string;
};

function translate(toast: Toast): string {
  return toast.caseOf({
    StickbotFailure: StickbotError.translate,
    SimpleWarning: identity,
  });
}

function treatment(toast: Toast): string {
  return toast.caseOf({
    SimpleWarning: always('warning'),
    StickbotFailure: always('warning'),
  });
}

class ToastsService extends Service {
  @tracked
  private _queue: Array<ToastHandle> = [];

  public get items(): Array<ToastHandle> {
    return this._queue;
  }

  public remove(target: string): void {
    const { _queue: current } = this;
    debug('removing toast "%s"', target);
    this._queue = current.filter(({ id }) => id !== target);
  }

  public add(toast: Toast): string {
    const id = uuid();
    debug('adding new toast "%s" - %o', id, toast);
    const translation = translate(toast);
    this._queue = [{ id, toast, treatment: treatment(toast), translation }, ...this._queue];
    return id;
  }
}

export default ToastsService;
