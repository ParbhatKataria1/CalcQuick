export type FactorPair = [number, number];

/** Order-independent key, so 4 × 13 and 13 × 4 count as the same pair. */
export const pairKey = ([a, b]: FactorPair) => (a <= b ? `${a}×${b}` : `${b}×${a}`);

export const formatPairs = (pairs: FactorPair[]) => pairs.map(([a, b]) => `${a} × ${b}`).join(', ');

/** Reads back the `4 × 13, 2 × 26` form stored as a record's correct answer. */
export function parsePairs(text: string): FactorPair[] | null {
  const matches = text.split(', ').map((part) => part.match(/^(\d+) × (\d+)$/));
  if (matches.some((match) => !match)) return null;
  return matches.map((match) => [Number(match![1]), Number(match![2])]);
}

/** Matches each filled row to an expected pair once; any blank, wrong or duplicate row makes it incorrect. */
export function checkPairs(pairs: FactorPair[], rows: string[][]) {
  const remaining = new Map(pairs.map((pair) => [pairKey(pair), pair]));
  const filled = rows.filter((row) => row.some((value) => value?.trim()));
  const found = new Set<string>();
  let wrong = 0;
  for (const [a = '', b = ''] of filled) {
    const key = pairKey([Number(a), Number(b)]);
    if (a.trim() && b.trim() && remaining.has(key)) {
      remaining.delete(key);
      found.add(key);
    } else {
      wrong += 1;
    }
  }
  return { correct: remaining.size === 0 && wrong === 0, found };
}
