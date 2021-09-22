export function generate(): string {
  return btoa(new Date().getTime() + '');
}
