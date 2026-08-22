import type { CategoryId, Difficulty, Question } from '@/types';

const randomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const choice = <T,>(items: T[]) => items[randomInt(0, items.length - 1)];

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const fractionPairs = [
  { fraction: '1/2', percent: 50 },
  { fraction: '1/3', percent: 33.33 },
  { fraction: '2/3', percent: 66.67 },
  { fraction: '1/4', percent: 25 },
  { fraction: '3/4', percent: 75 },
  { fraction: '1/5', percent: 20 },
  { fraction: '2/5', percent: 40 },
  { fraction: '3/5', percent: 60 },
  { fraction: '4/5', percent: 80 },
  { fraction: '1/6', percent: 16.67 },
  { fraction: '5/6', percent: 83.33 },
  { fraction: '1/8', percent: 12.5 },
  { fraction: '3/8', percent: 37.5 },
  { fraction: '5/8', percent: 62.5 },
  { fraction: '7/8', percent: 87.5 },
  { fraction: '1/10', percent: 10 },
  { fraction: '3/10', percent: 30 },
  { fraction: '7/10', percent: 70 },
  { fraction: '9/10', percent: 90 },
  { fraction: '1/12', percent: 8.33 },
  { fraction: '5/12', percent: 41.67 },
  { fraction: '7/12', percent: 58.33 },
  { fraction: '11/12', percent: 91.67 },
  { fraction: '1/16', percent: 6.25 },
  { fraction: '3/16', percent: 18.75 },
  { fraction: '5/16', percent: 31.25 },
  { fraction: '7/16', percent: 43.75 },
  { fraction: '9/16', percent: 56.25 },
  { fraction: '1/20', percent: 5 },
  { fraction: '3/20', percent: 15 },
  { fraction: '7/20', percent: 35 },
];

const levelRange = (difficulty: Difficulty, easy: [number, number], medium: [number, number], hard: [number, number]) => {
  if (difficulty === 'easy') return easy;
  if (difficulty === 'medium') return medium;
  return hard;
};

const numberQuestion = (
  category: CategoryId,
  prompt: string,
  answer: number,
  hint?: string,
  tolerance = 0,
): Question => {
  const normalizedAnswer = Number(answer.toFixed(2));
  return {
    id: uid(),
    category,
    prompt,
    answer: String(normalizedAnswer),
    numericAnswer: normalizedAnswer,
    tolerance,
    hint,
  };
};

function generateTables(difficulty: Difficulty): Question {
  const [minTable, maxTable] = levelRange(difficulty, [2, 12], [11, 20], [15, 30]);
  const [minMultiplier, maxMultiplier] = levelRange(difficulty, [2, 10], [4, 12], [6, 15]);
  const a = randomInt(minTable, maxTable);
  const b = randomInt(minMultiplier, maxMultiplier);
  return numberQuestion('tables', `${a} × ${b}`, a * b, `${a} table`);
}

function generateSquares(difficulty: Difficulty): Question {
  const [min, max] = levelRange(difficulty, [2, 15], [12, 30], [25, 40]);
  const n = randomInt(min, max);
  return numberQuestion('squares', `${n}²`, n * n, `Square of ${n}`);
}

function generateCubes(difficulty: Difficulty): Question {
  const [min, max] = levelRange(difficulty, [2, 8], [6, 14], [11, 20]);
  const n = randomInt(min, max);
  return numberQuestion('cubes', `${n}³`, n * n * n, `Cube of ${n}`);
}

function generateFractionToPercent(difficulty: Difficulty): Question {
  const easy = fractionPairs.filter((pair) => ['1/2', '1/4', '3/4', '1/5', '2/5', '3/5', '4/5', '1/10'].includes(pair.fraction));
  const medium = fractionPairs.filter((pair) => !pair.fraction.includes('/16') && !pair.fraction.includes('/12'));
  const pair = choice(difficulty === 'easy' ? easy : difficulty === 'medium' ? medium : fractionPairs);
  return numberQuestion('fractionToPercent', `${pair.fraction} = ?%`, pair.percent, 'Enter the percentage number only', 0.05);
}

function generatePercentToFraction(difficulty: Difficulty): Question {
  const easyPercents = [50, 25, 75, 20, 40, 60, 80, 10];
  const mediumPercents = [12.5, 37.5, 62.5, 87.5, 16.67, 33.33, 66.67, 83.33];
  const source = difficulty === 'easy'
    ? fractionPairs.filter((pair) => easyPercents.includes(pair.percent))
    : difficulty === 'medium'
      ? fractionPairs.filter((pair) => [...easyPercents, ...mediumPercents].includes(pair.percent))
      : fractionPairs;
  const pair = choice(source);
  return {
    id: uid(),
    category: 'percentToFraction',
    prompt: `${pair.percent}% = ?`,
    answer: pair.fraction,
    hint: 'Enter as a simplified fraction, e.g. 3/8',
  };
}

function generatePowers(difficulty: Difficulty): Question {
  const [min, max] = levelRange(difficulty, [1, 5], [4, 8], [7, 10]);
  const power = randomInt(min, max);
  return numberQuestion('powers', `2${toSuperscript(power)}`, 2 ** power, `2 to the power ${power}`);
}

function generateSquareRoots(difficulty: Difficulty): Question {
  const [min, max] = levelRange(difficulty, [2, 15], [12, 35], [25, 50]);
  const root = randomInt(min, max);
  return numberQuestion('squareRoots', `√${root * root}`, root, 'Perfect square root');
}

function generateAddition(difficulty: Difficulty): Question {
  if (difficulty === 'easy') {
    const a = randomInt(100, 599);
    const b = randomInt(100, 599);
    return numberQuestion('addition', `${a} + ${b}`, a + b);
  }
  if (difficulty === 'medium') {
    const a = randomInt(300, 1499);
    const b = randomInt(250, 999);
    return numberQuestion('addition', `${a} + ${b}`, a + b);
  }
  const nums = [randomInt(500, 2499), randomInt(350, 1599), randomInt(100, 999)];
  return numberQuestion('addition', nums.join(' + '), nums.reduce((sum, n) => sum + n, 0));
}

function generateSubtraction(difficulty: Difficulty): Question {
  const [minA, maxA] = levelRange(difficulty, [300, 999], [800, 2499], [1500, 5999]);
  const a = randomInt(minA, maxA);
  const b = randomInt(Math.floor(a * 0.25), a - 1);
  return numberQuestion('subtraction', `${a} − ${b}`, a - b);
}

function generateMultiplication(difficulty: Difficulty): Question {
  const [min, max] = levelRange(difficulty, [11, 25], [20, 69], [35, 99]);
  const a = randomInt(min, max);
  const b = randomInt(min, max);
  return numberQuestion('multiplication', `${a} × ${b}`, a * b);
}

function generateDivision(difficulty: Difficulty): Question {
  const [minDivisor, maxDivisor] = levelRange(difficulty, [2, 12], [8, 25], [12, 45]);
  const [minQuotient, maxQuotient] = levelRange(difficulty, [5, 30], [12, 65], [20, 120]);
  const divisor = randomInt(minDivisor, maxDivisor);
  const quotient = randomInt(minQuotient, maxQuotient);
  return numberQuestion('division', `${divisor * quotient} ÷ ${divisor}`, quotient);
}

function generateBanking(difficulty: Difficulty): Question {
  const type = randomInt(0, 5);
  if (type === 0) {
    const percents = difficulty === 'easy' ? [10, 20, 25, 50] : difficulty === 'medium' ? [12.5, 25, 37.5, 62.5, 75] : [6.25, 16.67, 18.75, 31.25, 43.75, 87.5];
    const percent = choice(percents);
    const baseMultiplier = percent === 16.67 ? 6 : percent === 6.25 ? 16 : percent === 18.75 ? 16 : percent === 31.25 ? 16 : percent === 43.75 ? 16 : 8;
    const base = randomInt(2, difficulty === 'hard' ? 20 : 12) * baseMultiplier * 10;
    return numberQuestion('banking', `${percent}% of ${base}`, (percent / 100) * base, 'Banking percentage drill', 0.1);
  }
  if (type === 1) {
    const fractions = ['1/4', '3/8', '5/8', '3/5', '7/10'];
    const fraction = choice(fractions);
    const [n, d] = fraction.split('/').map(Number);
    const base = randomInt(4, 16) * d * 10;
    return numberQuestion('banking', `${fraction} of ${base}`, (n / d) * base, 'Fraction of a quantity');
  }
  if (type === 2) {
    const a = randomInt(difficulty === 'easy' ? 12 : 18, difficulty === 'hard' ? 85 : 55);
    const b = randomInt(difficulty === 'easy' ? 11 : 16, difficulty === 'hard' ? 75 : 45);
    return numberQuestion('banking', `${a} × ${b}`, a * b, 'Useful for DI and simplification');
  }
  if (type === 3) {
    const divisor = randomInt(8, difficulty === 'hard' ? 40 : 24);
    const quotient = randomInt(12, difficulty === 'hard' ? 100 : 60);
    return numberQuestion('banking', `${divisor * quotient} ÷ ${divisor}`, quotient, 'Useful for ratios and averages');
  }
  if (type === 4) {
    const base = randomInt(4, 20) * 40;
    return numberQuestion('banking', `1.25 × ${base}`, base * 1.25, '125% conversion');
  }
  const a = randomInt(300, difficulty === 'hard' ? 2500 : 1200);
  const b = randomInt(200, difficulty === 'hard' ? 1500 : 800);
  return numberQuestion('banking', `${a} + ${b}`, a + b, 'Fast DI total');
}

const mixedCategories: CategoryId[] = [
  'tables',
  'squares',
  'cubes',
  'fractionToPercent',
  'percentToFraction',
  'powers',
  'squareRoots',
  'addition',
  'subtraction',
  'multiplication',
  'division',
];

export function generateQuestion(category: CategoryId, difficulty: Difficulty, weightedCategories?: CategoryId[]): Question {
  const actualCategory = category === 'mixed' ? choice(weightedCategories?.length ? weightedCategories : mixedCategories) : category;
  switch (actualCategory) {
    case 'tables': return generateTables(difficulty);
    case 'squares': return generateSquares(difficulty);
    case 'cubes': return generateCubes(difficulty);
    case 'fractionToPercent': return generateFractionToPercent(difficulty);
    case 'percentToFraction': return generatePercentToFraction(difficulty);
    case 'powers': return generatePowers(difficulty);
    case 'squareRoots': return generateSquareRoots(difficulty);
    case 'addition': return generateAddition(difficulty);
    case 'subtraction': return generateSubtraction(difficulty);
    case 'multiplication': return generateMultiplication(difficulty);
    case 'division': return generateDivision(difficulty);
    case 'banking': return generateBanking(difficulty);
    default: return generateAddition(difficulty);
  }
}

export function isAnswerCorrect(question: Question, rawAnswer: string): boolean {
  const answer = rawAnswer.trim().replace(/\s/g, '');
  if (!answer) return false;

  if (question.numericAnswer !== undefined) {
    const numeric = Number(answer.replace('%', ''));
    if (Number.isNaN(numeric)) return false;
    return Math.abs(numeric - question.numericAnswer) <= (question.tolerance ?? 0);
  }

  if (question.answer.includes('/')) {
    const [userN, userD] = answer.split('/').map(Number);
    const [correctN, correctD] = question.answer.split('/').map(Number);
    if (!userN || !userD || !correctN || !correctD) return false;
    return userN * correctD === correctN * userD;
  }

  return answer.toLowerCase() === question.answer.toLowerCase();
}

export function toSuperscript(value: number): string {
  const map: Record<string, string> = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  };
  return String(value).split('').map((char) => map[char] ?? char).join('');
}

export function getAdaptiveDifficulty(current: Difficulty, recentCorrect: boolean[], recentTimes: number[]): Difficulty {
  if (recentCorrect.length < 4) return current;
  const accuracy = recentCorrect.filter(Boolean).length / recentCorrect.length;
  const avgMs = recentTimes.reduce((sum, time) => sum + time, 0) / Math.max(1, recentTimes.length);

  if (accuracy >= 0.9 && avgMs < 4500) {
    if (current === 'easy') return 'medium';
    if (current === 'medium') return 'hard';
  }
  if (accuracy < 0.6) {
    if (current === 'hard') return 'medium';
    if (current === 'medium') return 'easy';
  }
  return current;
}
