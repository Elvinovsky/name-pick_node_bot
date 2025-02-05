
export function randomNumber(totalItems: number, limit: number): number {
  const maxSkip = Math.max(0, totalItems - limit);
  return Math.floor(Math.random() * (maxSkip + 1));
}
