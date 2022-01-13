export function always<T>(item: T): () => T {
  return () => item;
}

export function identity<T>(i: T): T {
  return i;
}

export const yes = always(true);
