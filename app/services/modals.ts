import Service from '@ember/service';
import * as Seidr from 'seidr';
import { tracked } from '@glimmer/tracking';
import debugLogger from 'ember-debug-logger';

const debug = debugLogger('service:modals');

export type ModalActivationKey<Parameters, Returns> = string & { _phantom?: [Parameters, Returns] };

export function modalKey<P, R>(key: string): ModalActivationKey<P, R> {
  return key as ModalActivationKey<P, R>;
}

type ModalQueueCursor = {
  key: ModalActivationKey<unknown, unknown>;
  parameters?: unknown;
  resolve: (item: unknown) => void;
};

class Modals extends Service {
  @tracked
  public queue: Array<ModalQueueCursor> = [];

  public lock<P, R>(key: ModalActivationKey<P, R>): Seidr.Maybe<P> {
    const [first] = this.queue;

    if (first && first.key === key) {
      return Seidr.Just(first.parameters as P);
    }

    return Seidr.Nothing();
  }

  public get active(): Seidr.Maybe<string> {
    const [first] = this.queue;
    return Seidr.Maybe.fromNullable(first?.key);
  }

  public close<R>(key: ModalActivationKey<unknown, R>, result: Seidr.Maybe<R>): void {
    const { queue } = this;
    const item = queue.find((item) => item.key === key);

    if (!item) {
      debug('[warn] attempted to close inactive modal "%s"', key);
      return;
    }

    item.resolve(result);
    this.queue = this.queue.filter((item) => item.key !== key);
  }

  public async activate<P, R>(key: ModalActivationKey<P, R>, parameters?: P): Promise<Seidr.Maybe<R>> {
    debug('opening modal "%s" - "%j"', key, parameters);
    const item = {
      key,
      parameters,
      resolve: (_item: Seidr.Maybe<R>) => {
        return;
      },
    };

    const promise = new Promise((resolve, _reject) => {
      item.resolve = resolve;
    }) as Promise<Seidr.Maybe<R>>;

    this.queue = [item, ...this.queue];
    return promise;
  }
}

export default Modals;
