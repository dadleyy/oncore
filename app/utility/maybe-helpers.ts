import * as Seidr from 'seidr';

export function zip<T, U>(first: Seidr.Maybe<T>, second: Seidr.Maybe<U>):  Seidr.Maybe<[T, U]> {
  return first.flatMap(inner => second.map(s => [inner, s]));
}

export function orErr<T>(error: Error, maybe: Seidr.Maybe<T>): Seidr.Result<Error, T> {
  return maybe.caseOf({
    Just: Seidr.Ok,
    Nothing: () => Seidr.Err(error),
  });
}
