import type { CategoryId, Question } from '@/types';
import { pickQuestionSet, type Candidate } from '@/lib/number-fact-generator';

/**
 * Fraction ↔ percentage facts from the banking-exam (IBPS / SBI PO & Clerk) conversion list:
 * unit fractions 1/2–1/20, their multiples up to twelfths, and the growth factors used for
 * percentage increase, profit & loss and data interpretation shortcuts.
 */
export type FractionSetId = 'unit' | 'multiples' | 'growth';
export type FractionDirection = 'toPercent' | 'toFraction' | 'both';

export type FractionFact = { numerator: number; denominator: number; set: FractionSetId };

export const fractionSets: Array<{ id: FractionSetId; title: string; description: string }> = [
  { id: 'unit', title: '1/2 to 1/20', description: 'The base list every banking aspirant memorizes: 1/7 = 14.28%, 1/16 = 6.25%…' },
  { id: 'multiples', title: 'Multiples up to twelfths', description: '2/3, 3/7, 5/8, 4/9, 7/11, 5/12… built from the unit values.' },
  { id: 'growth', title: 'Above 100% (growth factors)', description: '5/4 = 125%, 8/7 = 114.28%… for increases, profit and DI.' },
];

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

export const fractionFacts: FractionFact[] = [
  ...Array.from({ length: 19 }, (_, index) => ({ numerator: 1, denominator: index + 2, set: 'unit' as const })),
  ...Array.from({ length: 10 }, (_, index) => index + 3).flatMap((denominator) =>
    Array.from({ length: denominator - 2 }, (_, index) => index + 2)
      .filter((numerator) => gcd(numerator, denominator) === 1)
      .map((numerator) => ({ numerator, denominator, set: 'multiples' as const }))),
  ...Array.from({ length: 11 }, (_, index) => index + 2).map((denominator) => ({ numerator: denominator + 1, denominator, set: 'growth' as const })),
];

export const fractionLabel = ({ numerator, denominator }: FractionFact) => `${numerator}/${denominator}`;
export const exactPercent = ({ numerator, denominator }: FractionFact) => (numerator * 100) / denominator;
/** Whether the percentage ends within two decimal places (12.5%, 6.25%) rather than recurring (14.2857…%). */
export const isTerminating = ({ numerator, denominator }: FractionFact) => (numerator * 10000) % denominator === 0;

/** Two-decimal form shown in prompts, e.g. 14.29 or 12.5. */
export const decimalPercent = (fact: FractionFact) => String(Math.round(exactPercent(fact) * 100) / 100);

/** Mixed-number form used in exam notes, e.g. 14 2/7 for 1/7. Null when the percentage terminates. */
export function mixedPercent(fact: FractionFact) {
  if (isTerminating(fact)) return null;
  const whole = Math.floor((fact.numerator * 100) / fact.denominator);
  const remainder = (fact.numerator * 100) % fact.denominator;
  const divisor = gcd(remainder, fact.denominator);
  return `${whole} ${remainder / divisor}/${fact.denominator / divisor}`;
}

export const fractionCategories: Record<Exclude<FractionDirection, 'both'>, CategoryId> = { toPercent: 'fractionToPercent', toFraction: 'percentToFraction' };
const MISSED_WEIGHT = 4;

export function generateFractionSet(sets: FractionSetId[], direction: FractionDirection, count: number, missed = new Set<string>()): Question[] {
  const directions = direction === 'both' ? (['toPercent', 'toFraction'] as const) : [direction];
  const candidates = fractionFacts.filter((fact) => sets.includes(fact.set)).flatMap((fact) => directions.map<Candidate>((dir) => {
    const prompt = dir === 'toPercent' ? `${fractionLabel(fact)} = ?%` : `${decimalPercent(fact)}% = ?`;
    const question = (): Question => dir === 'toPercent'
      ? {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          category: fractionCategories.toPercent,
          prompt,
          answer: decimalPercent(fact),
          numericAnswer: exactPercent(fact),
          // Accepts both the rounded and truncated forms (14.29 or 14.28) and the mixed form 14 2/7.
          tolerance: isTerminating(fact) ? 0 : 0.01,
          hint: isTerminating(fact) ? 'Enter the percentage' : 'Up to 2 decimals (14.28) or mixed form (14 2/7)',
        }
      : {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          category: fractionCategories.toFraction,
          prompt,
          answer: fractionLabel(fact),
          hint: 'Answer as a fraction, e.g. 3/8',
        };
    return { group: fact.denominator, weight: missed.has(prompt) ? MISSED_WEIGHT : 1, question };
  }));
  return pickQuestionSet(candidates, count);
}
