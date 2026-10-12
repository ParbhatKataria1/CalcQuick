import type { CategoryId, Difficulty, Question } from '@/types';

export type BankingTechnique = 'complements' | 'compensation' | 'leftToRight' | 'pairing' | 'chunking';
export type MultiplyDivideTechnique =
  | 'distributive' | 'crissCross' | 'nearBase' | 'baseMethod' | 'doubleHalf' | 'squareIdentity' | 'specialMultiplier'
  | 'squareEnding5' | 'squareBase50' | 'squareBase100' | 'squareGeneral' | 'cubeGeneral' | 'squareRoot' | 'cubeRoot'
  | 'reverseMultiplication' | 'breakDividend' | 'simplifyDivision' | 'factorDivision' | 'approximation';

const randomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const choice = <T,>(items: T[]) => items[randomInt(0, items.length - 1)];
/** A random number that isn't a multiple of 10, since those make the tricks trivial. */
const randomNonRound = (min: number, max: number): number => {
  const value = randomInt(min, max);
  return value % 10 === 0 ? randomNonRound(min, max) : value;
};

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

export function generateBankingTechniqueQuestion(technique: BankingTechnique, difficulty: Difficulty, complementMaxDigits?: 1 | 2 | 3): Question {
  if (technique === 'complements') {
    const maxDigits = complementMaxDigits ?? (difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3);
    const digits = randomInt(1, maxDigits);
    const base = 10 ** digits;
    const value = randomInt(base === 10 ? 1 : base === 100 ? 11 : 101, base - 1);
    return numberQuestion('banking', `${base} − ${value}`, base - value, `Complement to ${base}: what must you add to ${value}?`);
  }
  if (technique === 'compensation') {
    const boundary = choice(difficulty === 'easy' ? [100, 200, 300, 500] : difficulty === 'medium' ? [200, 300, 500, 700, 1000] : [500, 1000, 1500, 2000]);
    const offset = randomInt(1, difficulty === 'hard' ? 9 : 4);
    const near = boundary - offset;
    const first = randomInt(Math.max(near + 20, boundary), boundary + (difficulty === 'hard' ? 1800 : 700));
    const addition = Math.random() < 0.5;
    return numberQuestion('banking', `${first} ${addition ? '+' : '−'} ${near}`, addition ? first + near : first - near, `${near} = ${boundary} − ${offset}. Use ${addition ? `+${boundary} − ${offset}` : `−${boundary} + ${offset}`}.`);
  }
  if (technique === 'leftToRight') {
    const max = difficulty === 'easy' ? 599 : difficulty === 'medium' ? 999 : 2499;
    const a = randomInt(200, max);
    const b = randomInt(120, Math.min(999, max));
    const hundreds = Math.floor(b / 100) * 100;
    const tens = Math.floor((b % 100) / 10) * 10;
    return numberQuestion('banking', `${a} + ${b}`, a + b, `Jump left → right: +${hundreds}, +${tens}, +${b % 10}.`);
  }
  if (technique === 'pairing') {
    const target = difficulty === 'easy' ? 100 : difficulty === 'medium' ? 500 : 1000;
    const a = randomInt(Math.floor(target * 0.18), Math.floor(target * 0.72));
    const c = randomInt(Math.floor(target * 0.12), Math.floor(target * 0.65));
    const values = Math.random() < 0.5 ? [a, c, target - a, target - c] : [a, target - c, c, target - a];
    return numberQuestion('banking', values.join(' + '), target * 2, `Find two pairs that each make ${target}.`);
  }
  const max = difficulty === 'easy' ? 799 : difficulty === 'medium' ? 1499 : 3999;
  const a = randomInt(350, max);
  const b = randomInt(121, Math.min(a - 1, difficulty === 'hard' ? 1499 : 699));
  const addition = Math.random() < 0.5;
  const hundreds = Math.floor(b / 100) * 100;
  const tens = Math.floor((b % 100) / 10) * 10;
  return numberQuestion('banking', `${a} ${addition ? '+' : '−'} ${b}`, addition ? a + b : a - b, `Break ${b} into ${hundreds} + ${tens} + ${b % 10}, then move one chunk at a time.`);
}

export function generateBankingTechniqueSet(techniques: BankingTechnique[], count: number, difficulty: Difficulty, complementMaxDigits?: 1 | 2 | 3): Question[] {
  return Array.from({ length: count }, (_, index) => generateBankingTechniqueQuestion(techniques[index % techniques.length], difficulty, complementMaxDigits));
}

export function generateMultiplyDivideQuestion(technique: MultiplyDivideTechnique, difficulty: Difficulty): Question {
  const multiplierMax = difficulty === 'easy' ? 12 : difficulty === 'medium' ? 25 : 49;
  if (technique === 'distributive') {
    const a = randomInt(difficulty === 'easy' ? 12 : 24, difficulty === 'hard' ? 99 : 69);
    const b = randomInt(11, multiplierMax);
    const tens = Math.floor(b / 10) * 10;
    return numberQuestion('multiplication', `${a} × ${b}`, a * b, `Distribute: ${a} × ${tens} + ${a} × ${b - tens}.`);
  }
  if (technique === 'nearBase') {
    const base = difficulty === 'hard' && Math.random() < 0.3 ? 1000 : 100;
    const offset = choice([-3, -2, -1, 1, 2, 3]);
    const a = randomInt(24, difficulty === 'easy' ? 69 : 129);
    return numberQuestion('multiplication', `${a} × ${base + offset}`, a * (base + offset), `Use ${a} × (${base} ${offset < 0 ? '−' : '+'} ${Math.abs(offset)}).`);
  }
  if (technique === 'doubleHalf') {
    const a = choice([12, 16, 20, 24, 25, 32, 40, 48]);
    const b = randomInt(12, difficulty === 'hard' ? 75 : 48);
    return numberQuestion('multiplication', `${a} × ${b}`, a * b, `Halve the even factor and double the other until one factor is easy.`);
  }
  if (technique === 'squareIdentity') {
    const center = randomInt(difficulty === 'easy' ? 15 : 30, difficulty === 'hard' ? 100 : 70);
    const gap = randomInt(1, difficulty === 'hard' ? 6 : 4);
    return numberQuestion('multiplication', `${center - gap} × ${center + gap}`, center * center - gap * gap, `Use (${center} − ${gap})(${center} + ${gap}) = ${center}² − ${gap}².`);
  }
  if (technique === 'specialMultiplier') {
    const special = choice([5, 25, 50, 125]);
    const unit = special === 125 ? 8 : special === 25 ? 4 : special === 50 ? 2 : 1;
    const a = randomInt(3, difficulty === 'hard' ? 30 : 16) * unit;
    const cue = special === 5 ? '×10 ÷2' : special === 25 ? '×100 ÷4' : special === 50 ? '×100 ÷2' : '×1000 ÷8';
    return numberQuestion('multiplication', `${a} × ${special}`, a * special, `Special multiplier: ${cue}.`);
  }
  if (technique === 'crissCross') {
    const a = randomNonRound(difficulty === 'easy' ? 11 : 21, difficulty === 'easy' ? 49 : 99);
    const b = randomNonRound(difficulty === 'easy' ? 11 : 21, difficulty === 'hard' ? 99 : 69);
    return numberQuestion('multiplication', `${a} × ${b}`, a * b, 'Units, cross, tens — right to left.');
  }
  if (technique === 'baseMethod') {
    const [base, spread] = difficulty === 'easy' ? [10, 9] : difficulty === 'medium' ? [100, 12] : choice([[100, 25], [1000, 15]]);
    // Below 10 the numbers are single digits, so base 10 only uses 11–19.
    const offset = () => (base === 10 ? 1 : choice([-1, 1])) * randomInt(1, spread);
    const a = base + offset();
    const b = base + offset();
    const signed = (value: number) => (value < 0 ? `−${-value}` : `+${value}`);
    return numberQuestion('multiplication', `${a} × ${b}`, a * b, `Base ${base}: ${signed(a - base)} and ${signed(b - base)}.`);
  }
  if (technique === 'squareEnding5') {
    const n = difficulty === 'easy' ? randomInt(1, 9) : difficulty === 'medium' ? randomInt(10, 19) : randomInt(20, 99);
    const value = n * 10 + 5;
    return numberQuestion('squares', `${value}²`, value * value, `${n} × ${n + 1}, then 25.`);
  }
  if (technique === 'squareBase50' || technique === 'squareBase100') {
    const base = technique === 'squareBase50' ? 50 : 100;
    const spread = base === 50 ? (difficulty === 'easy' ? 6 : difficulty === 'medium' ? 12 : 20) : (difficulty === 'easy' ? 6 : difficulty === 'medium' ? 15 : 25);
    const value = base + choice([-1, 1]) * randomInt(1, spread);
    return numberQuestion('squares', `${value}²`, value * value, `Base ${base}: the difference is ${value - base > 0 ? '+' : '−'}${Math.abs(value - base)}.`);
  }
  if (technique === 'squareGeneral') {
    const value = difficulty === 'hard' ? randomNonRound(101, 299) : randomNonRound(difficulty === 'easy' ? 21 : 31, difficulty === 'easy' ? 69 : 99);
    return numberQuestion('squares', `${value}²`, value * value, `a = ${Math.floor(value / 10)}, b = ${value % 10}: join a² | b², then add 20ab.`);
  }
  if (technique === 'cubeGeneral') {
    const value = randomNonRound(difficulty === 'easy' ? 11 : 21, difficulty === 'easy' ? 19 : difficulty === 'medium' ? 49 : 99);
    return numberQuestion('cubes', `${value}³`, value ** 3, `a = ${Math.floor(value / 10)}, b = ${value % 10}: join a³ | b³, then add 30ab × ${value}.`);
  }
  if (technique === 'squareRoot') {
    const root = difficulty === 'hard' ? randomNonRound(101, 199) : randomNonRound(difficulty === 'easy' ? 21 : 31, difficulty === 'easy' ? 59 : 99);
    return numberQuestion('squareRoots', `√${root * root}`, root, 'Front digits give the tens, the last digit narrows the ones.');
  }
  if (technique === 'cubeRoot') {
    const root = randomNonRound(11, difficulty === 'easy' ? 29 : difficulty === 'medium' ? 59 : 99);
    return numberQuestion('cubes', `∛${root ** 3}`, root, 'Last digit gives the ones digit, the front group gives the tens.');
  }
  if (technique === 'approximation') {
    const multiplication = Math.random() < 0.5;
    if (multiplication) {
      const cleanA = randomInt(2, difficulty === 'hard' ? 20 : 10) * 100;
      const cleanB = randomInt(2, difficulty === 'hard' ? 50 : 20) * 10;
      const a = cleanA + randomInt(-8, 8);
      const b = cleanB + randomInt(-4, 4);
      return numberQuestion('multiplication', `${a} × ${b} ≈ ?`, cleanA * cleanB, `Round to ${cleanA} × ${cleanB}. Enter the estimated value.`);
    }
    const divisor = randomInt(2, 9) * 10;
    const quotient = randomInt(5, difficulty === 'hard' ? 80 : 30) * 10;
    const dividend = divisor * quotient + randomInt(-9, 9);
    return numberQuestion('division', `${dividend} ÷ ${divisor + choice([-1, 1])} ≈ ?`, quotient, `Round to ${divisor * quotient} ÷ ${divisor}. Enter the estimate.`);
  }
  const divisor = randomInt(12, difficulty === 'hard' ? 48 : 30);
  const quotient = randomInt(12, difficulty === 'hard' ? 80 : 50);
  const dividend = divisor * quotient;
  if (technique === 'reverseMultiplication') return numberQuestion('division', `${dividend} ÷ ${divisor}`, quotient, `Ask: ${divisor} × what = ${dividend}?`);
  if (technique === 'breakDividend') {
    const firstPart = divisor * Math.floor(quotient / 10) * 10;
    return numberQuestion('division', `${dividend} ÷ ${divisor}`, quotient, `Break ${dividend} into ${firstPart} + ${dividend - firstPart}.`);
  }
  if (technique === 'simplifyDivision') {
    const factor = choice([2, 3, 4, 5, 6]);
    return numberQuestion('division', `${dividend * factor} ÷ ${divisor * factor}`, quotient, `Divide both numbers by their common factor ${factor} first.`);
  }
  const factors = choice([[4, 8], [5, 7], [3, 6], [4, 6]]);
  const factoredDivisor = factors[0] * factors[1];
  return numberQuestion('division', `${factoredDivisor * quotient} ÷ ${factoredDivisor}`, quotient, `Factor ${factoredDivisor} as ${factors[0]} × ${factors[1]} and divide in two steps.`);
}

export function generateMultiplyDivideSet(techniques: MultiplyDivideTechnique[], count: number, difficulty: Difficulty): Question[] {
  return Array.from({ length: count }, (_, index) => generateMultiplyDivideQuestion(techniques[index % techniques.length], difficulty));
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

/** Reads plain numbers, fractions (100/7) and mixed numbers (14 2/7). */
function parseNumber(value: string) {
  const mixed = value.match(/^(-?\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const fraction = value.replace(/\s/g, '').match(/^(-?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
  if (fraction) return Number(fraction[1]) / Number(fraction[2]);
  return Number(value.replace(/\s/g, ''));
}

export function isAnswerCorrect(question: Question, rawAnswer: string): boolean {
  const answer = rawAnswer.trim().replace(/\s/g, '');
  if (!answer) return false;

  if (question.numericAnswer !== undefined) {
    const numeric = parseNumber(rawAnswer.trim().replace('%', ''));
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
