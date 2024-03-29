import * as Seidr from 'seidr';

export function zip<T, U>(first: Seidr.Maybe<T>, second: Seidr.Maybe<U>): Seidr.Maybe<[T, U]> {
  return first.flatMap((inner) => second.map((s) => [inner, s]));
}

export function orErr<T, E>(error: E, maybe: Seidr.Maybe<T>): Seidr.Result<E, T> {
  return maybe.caseOf({
    Just: Seidr.Ok,
    Nothing: () => Seidr.Err(error),
  });
}

export function collect<T>(maybe: Seidr.Maybe<Seidr.Maybe<T>>): Seidr.Maybe<T> {
  return maybe.flatMap((inner) => inner);
}

export function flatten<T>(maybes: Array<Seidr.Maybe<T>>): Array<T> {
  return maybes.reduce((acc, mayb) => [...acc, ...mayb.map((item) => [item]).getOrElse([])], []);
}

export async function asyncMap<T, U>(maybe: Seidr.Maybe<T>, mapper: (input: T) => Promise<U>): Promise<Seidr.Maybe<U>> {
  return maybe.caseOf({
    Just: async (inner) => Seidr.Just(await mapper(inner)),
    Nothing: () => Promise.resolve(Seidr.Nothing()),
  });
}
