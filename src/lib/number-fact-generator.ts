import type { AnswerRecord, CategoryId, Question } from '@/types';
import { getDueReviews } from '@/lib/review';
import { formatPairs, pairKey, type FactorPair } from '@/lib/factor-pairs';

export type NumberFactKind = 'tables' | 'squares' | 'cubes';

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const numberFactConfig = {
  tables: { title: 'Multiplication Tables', shortTitle: 'Tables', min: 2, max: 30, category: 'tables' as CategoryId, description: 'Build instant multiplication recall from table 2 through table 30.' },
  squares: { title: 'Squares', shortTitle: 'Squares', min: 1, max: 40, category: 'squares' as CategoryId, description: 'Memorize perfect squares from 1² through 40².' },
  cubes: { title: 'Cubes', shortTitle: 'Cubes', min: 1, max: 20, category: 'cubes' as CategoryId, description: 'Memorize perfect cubes from 1³ through 20³.' },
};

// 1 and multiples of 10 are trivial, so they are left out of practice.
const isPracticeValue = (value: number) => value > 1 && value % 10 !== 0;
const TABLE_MULTIPLIERS = [2, 3, 4, 5, 6, 7, 8, 9];
const HARD_MULTIPLIER_WEIGHT = 3;
const MISSED_WEIGHT = 4;

export function getPracticeValues(kind: NumberFactKind) {
  const config = numberFactConfig[kind];
  return Array.from({ length: config.max - config.min + 1 }, (_, index) => config.min + index).filter(isPracticeValue);
}

export type FactDirection = 'forward' | 'reverse' | 'both';

export type Candidate = { group: number | string; question: () => Question; weight: number };

const fact = (category: CategoryId, prompt: string, answer: number, hint: string): Question => ({ id: uid(), category, prompt, answer: String(answer), numericAnswer: answer, hint });

function buildCandidates(kind: NumberFactKind, bases: number[], direction: FactDirection, missed: Set<string>): Candidate[] {
  const forward = direction !== 'reverse';
  const reverse = direction !== 'forward';
  const candidate = (base: number, prompt: string, answer: number, hint: string, weight = 1): Candidate =>
    ({ group: base, weight: weight * (missed.has(prompt) ? MISSED_WEIGHT : 1), question: () => fact(numberFactConfig[kind].category, prompt, answer, hint) });
  const products = kind === 'tables' && reverse ? buildProductCandidates(bases, missed) : [];
  return [...products, ...bases.flatMap((base) => {
    if (kind === 'tables') {
      return TABLE_MULTIPLIERS.flatMap((multiplier) => {
        const weight = multiplier >= 6 ? HARD_MULTIPLIER_WEIGHT : 1;
        const product = base * multiplier;
        return forward ? [candidate(base, `${base} × ${multiplier}`, product, `Table of ${base}`, weight)] : [];
      });
    }
    const power = kind === 'squares' ? 2 : 3;
    const symbol = power === 2 ? '²' : '³';
    const name = power === 2 ? 'Square' : 'Cube';
    const result = base ** power;
    return [
      ...(forward ? [candidate(base, `${base}${symbol}`, result, `${name} of ${base}`)] : []),
      ...(reverse ? [candidate(base, `?${symbol} = ${result}`, base, `${name} root of ${result}`)] : []),
    ];
  })];
}

/** Reverse tables: show a product and ask for every pair (table in range × 2–9) that makes it. */
function buildProductCandidates(bases: number[], missed: Set<string>): Candidate[] {
  const byProduct = new Map<number, { pairs: Map<string, FactorPair>; table: number; hard: boolean }>();
  for (const base of bases) {
    for (const multiplier of TABLE_MULTIPLIERS) {
      const product = base * multiplier;
      const entry = byProduct.get(product) ?? { pairs: new Map(), table: base, hard: false };
      const pair: FactorPair = [Math.max(base, multiplier), Math.min(base, multiplier)];
      entry.pairs.set(pairKey(pair), pair);
      entry.table = Math.max(entry.table, base);
      entry.hard ||= multiplier >= 6;
      byProduct.set(product, entry);
    }
  }
  const range = `tables ${bases[0]}–${bases[bases.length - 1]}`;
  return [...byProduct].map(([product, entry]) => {
    const pairs = [...entry.pairs.values()].sort((a, b) => b[0] - a[0]);
    const prompt = `${product} = ? × ?`;
    return {
      group: entry.table,
      weight: (entry.hard ? HARD_MULTIPLIER_WEIGHT : 1) * (missed.has(prompt) ? MISSED_WEIGHT : 1),
      question: () => ({ id: uid(), category: 'tables', prompt, answer: formatPairs(pairs), pairs, hint: `Find all ${pairs.length} ${pairs.length === 1 ? 'way' : 'ways'} in ${range}` }),
    };
  });
}

function takeWeighted(pool: Candidate[]): Candidate {
  const total = pool.reduce((sum, candidate) => sum + candidate.weight, 0);
  let roll = Math.random() * total;
  const index = pool.findIndex((candidate) => (roll -= candidate.weight) < 0);
  return pool.splice(index === -1 ? pool.length - 1 : index, 1)[0];
}

function shuffle<T>(items: T[]) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  // When the range is too small for unique questions, keep repeats from landing back to back.
  for (let i = 1; i < items.length; i += 1) {
    if (items[i] !== items[i - 1]) continue;
    const swap = items.findIndex((item, j) => j > i && item !== items[i - 1] && item !== items[i + 1]);
    if (swap !== -1) [items[i], items[swap]] = [items[swap], items[i]];
  }
  return items;
}

/**
 * Picks `count` questions by weight without repeating until every candidate has been used,
 * covering each group at least once when there are enough questions, then shuffles them.
 */
export function pickQuestionSet(all: Candidate[], count: number): Question[] {
  if (!all.length) return [];
  const groups = [...new Set(all.map((candidate) => candidate.group))];
  let pool = [...all];
  const picked: Candidate[] = [];
  const draw = (candidates: Candidate[]) => {
    const choice = takeWeighted(candidates);
    pool = pool.filter((candidate) => candidate !== choice);
    picked.push(choice);
  };

  if (count >= groups.length) groups.forEach((group) => draw(pool.filter((candidate) => candidate.group === group)));
  while (picked.length < count) {
    // Every unique question has been used; start over so repeats are spread evenly.
    if (!pool.length) pool = [...all];
    draw(pool);
  }
  return shuffle(picked).map((candidate) => candidate.question());
}

/** Prompts in these categories that are due for spaced review. */
export function getMissedPrompts(categories: CategoryId[], answers: AnswerRecord[]) {
  return new Set(getDueReviews(answers).filter(({ record }) => categories.includes(record.category)).map(({ record }) => record.prompt));
}

export function generateNumberFactSet(kind: NumberFactKind, from: number, to: number, count: number, direction: FactDirection = 'forward', missed = new Set<string>()): Question[] {
  const bases = getPracticeValues(kind).filter((value) => value >= from && value <= to);
  return pickQuestionSet(buildCandidates(kind, bases, direction, missed), count);
}

export function getNumberFactRows(kind: NumberFactKind) {
  const config = numberFactConfig[kind];
  return Array.from({ length: config.max - config.min + 1 }, (_, index) => {
    const value = config.min + index;
    return { value, result: kind === 'tables' ? null : value ** (kind === 'squares' ? 2 : 3) };
  });
}
