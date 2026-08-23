import type { CategoryId, Question } from '@/types';

export type NumberFactKind = 'tables' | 'squares' | 'cubes';

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const numberFactConfig = {
  tables: { title: 'Multiplication Tables', shortTitle: 'Tables', min: 2, max: 30, category: 'tables' as CategoryId, description: 'Build instant multiplication recall from table 2 through table 30.' },
  squares: { title: 'Squares', shortTitle: 'Squares', min: 1, max: 40, category: 'squares' as CategoryId, description: 'Memorize perfect squares from 1² through 40².' },
  cubes: { title: 'Cubes', shortTitle: 'Cubes', min: 1, max: 20, category: 'cubes' as CategoryId, description: 'Memorize perfect cubes from 1³ through 20³.' },
};

export function generateNumberFactSet(kind: NumberFactKind, from: number, to: number, count: number): Question[] {
  return Array.from({ length: count }, (_, index) => {
    const base = count >= to - from + 1 ? from + (index % (to - from + 1)) : randomInt(from, to);
    if (kind === 'tables') {
      const multiplier = randomInt(2, 12);
      return { id: uid(), category: 'tables', prompt: `${base} × ${multiplier}`, answer: String(base * multiplier), numericAnswer: base * multiplier, hint: `Table of ${base}` };
    }
    const power = kind === 'squares' ? 2 : 3;
    const answer = base ** power;
    return { id: uid(), category: kind, prompt: `${base}${power === 2 ? '²' : '³'}`, answer: String(answer), numericAnswer: answer, hint: `${power === 2 ? 'Square' : 'Cube'} of ${base}` };
  });
}

export function getNumberFactRows(kind: NumberFactKind) {
  const config = numberFactConfig[kind];
  return Array.from({ length: config.max - config.min + 1 }, (_, index) => {
    const value = config.min + index;
    return { value, result: kind === 'tables' ? null : value ** (kind === 'squares' ? 2 : 3) };
  });
}
