import * as Seidr from 'seidr';

export async function awaitResult<T>(
  promise: Promise<T>
): Promise<Seidr.Result<Error, T>> {
  try {
    const data = await promise;
    return Seidr.Ok(data);
  } catch (error) {
    return Seidr.Err(error);
  }
}

export async function asyncMap<T, U>(
  result: Seidr.Result<Error, T>,
  mapper: (item: T) => Promise<U>
): Promise<Seidr.Result<Error, U>> {
  return result.caseOf({
    Ok: (data) => awaitResult(mapper(data)),
    Err: (error) => Promise.resolve(Seidr.Err(error)),
  });
}
