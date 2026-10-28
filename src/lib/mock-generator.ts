import { evaluate } from '@/lib/expression';
import type { MockQuestion, MockSource, MockTest, MockTestSection, QuestionSet, QuestionTemplate, Section, SetContent, StaticQuestion } from '@/types/mock-test';

export type Rng = () => number;

/** mulberry32: a small seeded generator, so a test can be rebuilt from its seed. */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const OPTION_COUNT = 5;
// Sampling is cheap, and the difficulty checks reject many draws, so allow plenty of attempts.
const MAX_TRIES = 600;
/** Wrong options never sit closer than this to the answer, so the question stays answerable. */
const MIN_OPTION_GAP = 0.02;

function shuffle<T>(items: T[], rng: Rng): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index--) {
    const swap = Math.floor(rng() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

const decimalsOf = (value: number) => (String(value).split('.')[1] ?? '').length;

function sample(variable: QuestionTemplate['variables'][number], rng: Rng) {
  const step = variable.step > 0 ? variable.step : 1;
  const steps = Math.floor((variable.max - variable.min) / step + 1e-9);
  const value = variable.min + Math.floor(rng() * (steps + 1)) * step;
  return Number(value.toFixed(decimalsOf(step)));
}

function roundTo(value: number, format: QuestionTemplate['answerFormat']) {
  return format === 'integer' ? Math.round(value) : Math.round(value * 100) / 100;
}

/** An answer counts as clean when it is positive and already whole (or 2 decimals) before rounding. */
function isClean(value: number, format: QuestionTemplate['answerFormat']) {
  if (!Number.isFinite(value) || value <= 0) return false;
  return Math.abs(value - roundTo(value, format)) < 1e-6;
}

const integerDigits = (value: number) => String(Math.trunc(Math.abs(value))).length;
const trailingZeros = (value: number) => {
  if (!Number.isInteger(value) || value === 0) return 0;
  let count = 0;
  for (let rest = Math.abs(value); rest % 10 === 0; rest /= 10) count++;
  return count;
};

/**
 * Whether a new number takes the same effort as the original: same number of digits, same
 * roundness (1297 stays un-round, 3080 keeps one trailing zero) and whole if the original was whole.
 */
export function sameShape(value: number, original: number | undefined) {
  if (original === undefined || !Number.isFinite(original)) return true;
  if (!Number.isFinite(value)) return false;
  if (Number.isInteger(original) !== Number.isInteger(value)) return false;
  if (Number.isInteger(original) && decimalsOf(value) !== 0) return false;
  if (!Number.isInteger(original) && decimalsOf(value) > Math.max(2, decimalsOf(original))) return false;
  return integerDigits(value) === integerDigits(original) && trailingZeros(value) === trailingZeros(original);
}

const formatNumber = (value: number) => value.toLocaleString('en-IN', { maximumFractionDigits: 2 });

function fill(text: string, values: Record<string, number>) {
  return text.replace(/\{([a-z_][a-z0-9_]*)\}/gi, (match, name: string) => (Object.hasOwn(values, name) ? formatNumber(values[name]) : match));
}

const formatOption = (template: QuestionTemplate, value: number) =>
  (template.optionFormat.includes('{value}') ? template.optionFormat : '{value}').replace('{value}', formatNumber(value));

/** Reads the number out of an option such as "₹1,468", "26.5%" or "120 km". */
export function parseOptionNumber(option: string) {
  const match = option.replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

/** The largest relative gap between the original's answer and its wrong options. */
export function optionSpreadOf(question: StaticQuestion) {
  const answer = parseOptionNumber(question.options[question.answerIndex] ?? '');
  const others = question.options.filter((_, index) => index !== question.answerIndex).map(parseOptionNumber);
  if (!answer || others.some((value) => value === null)) return undefined;
  return Math.max(...others.map((value) => Math.abs((value as number) - answer) / Math.abs(answer)));
}

/** Wrong options near the answer, within the original's spread, for when the AI's distractors collide or fail. */
function nearbyValues(answer: number, format: QuestionTemplate['answerFormat'], spread: number, rng: Rng) {
  return Array.from({ length: 24 }, () => {
    const ratio = MIN_OPTION_GAP + rng() * Math.max(0, spread - MIN_OPTION_GAP);
    return roundTo(answer * (rng() < 0.5 ? 1 + ratio : 1 - ratio), format);
  }).filter((value) => value > 0);
}

/** Variables, then derived values in order; null when a derived value isn't a clean whole number. */
function computeValues(template: QuestionTemplate, base: Record<string, number>) {
  const values = { ...base };
  for (const item of template.derived ?? []) {
    const value = evaluate(item.expr, values);
    if (!Number.isFinite(value) || Math.abs(value - Math.round(value * 100) / 100) > 1e-6) return null;
    values[item.name] = Math.round(value * 100) / 100;
  }
  return values;
}

/** The original question's numbers, when the template recorded them. */
function originalValues(template: QuestionTemplate) {
  if (!template.variables.every((variable) => variable.value !== undefined)) return null;
  try {
    return computeValues(template, Object.fromEntries(template.variables.map((variable) => [variable.name, variable.value as number])));
  } catch {
    return null;
  }
}

/**
 * Builds one question from a template with fresh numbers. Every number keeps the shape of the original,
 * the answer is clean and the same size as the original's, and the wrong options sit as close to it as
 * the original's did. Returns null when the template never produces a valid question.
 */
export function instantiate(template: QuestionTemplate, rng: Rng): StaticQuestion | null {
  const original = originalValues(template);
  let originalAnswer: number | undefined;
  try {
    originalAnswer = original ? evaluate(template.answerExpr, original) : undefined;
  } catch {
    return null;
  }
  const spread = Math.max(template.optionSpread ?? 0.25, MIN_OPTION_GAP * 2);

  for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
    const base: Record<string, number> = {};
    for (const variable of template.variables) base[variable.name] = sample(variable, rng);
    try {
      const values = computeValues(template, base);
      if (!values) continue;
      if (original && !Object.keys(values).every((name) => sameShape(values[name], original[name]))) continue;
      // Changing every number keeps a fresh question from being the original in disguise.
      if (original && Object.keys(base).every((name) => base[name] === original[name])) continue;

      const rawAnswer = evaluate(template.answerExpr, values);
      if (!isClean(rawAnswer, template.answerFormat)) continue;
      const answer = roundTo(rawAnswer, template.answerFormat);
      if (originalAnswer !== undefined && !sameShape(answer, roundTo(originalAnswer, template.answerFormat))) continue;

      const correct = formatOption(template, answer);
      const seen = new Set([correct]);
      const wrong: string[] = [];
      const candidates = [
        ...template.distractorExprs.map((expr) => { try { return roundTo(evaluate(expr, values), template.answerFormat); } catch { return NaN; } }),
        ...nearbyValues(answer, template.answerFormat, spread, rng),
      ];
      for (const candidate of candidates) {
        if (wrong.length === OPTION_COUNT - 1) break;
        if (!Number.isFinite(candidate) || candidate <= 0) continue;
        const gap = Math.abs(candidate - answer) / answer;
        // Too far and the option is easy to rule out; too close and it's a coin toss.
        if (gap > spread * 1.25 || gap < MIN_OPTION_GAP / 2) continue;
        const option = formatOption(template, candidate);
        if (seen.has(option)) continue;
        seen.add(option);
        wrong.push(option);
      }
      if (wrong.length < OPTION_COUNT - 1) continue;
      const options = shuffle([correct, ...wrong], rng);
      return { text: fill(template.text, values), options, answerIndex: options.indexOf(correct), explanation: fill(template.explanation, { ...values, answer }) };
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Whether a template is trustworthy: put back the original numbers and it must give the original's
 * answer, and it must keep producing valid new questions. Checked once, when the paper is read.
 */
export function templateWorks(template: QuestionTemplate, originalQuestion: StaticQuestion) {
  const original = originalValues(template);
  const expected = parseOptionNumber(originalQuestion.options[originalQuestion.answerIndex] ?? '');
  if (original && expected !== null) {
    try {
      const answer = evaluate(template.answerExpr, original);
      if (Math.abs(answer - expected) > Math.max(0.011, Math.abs(expected) * 0.001)) return false;
    } catch {
      return false;
    }
  }
  const rng = createRng(1);
  return Array.from({ length: 3 }, () => instantiate(template, rng)).every(Boolean);
}

export const isTemplated = (set: QuestionSet) => Boolean(set.templates?.length);

/** How many unseen versions a set can still give: unlimited for templates, else the unused AI variants. */
export const unseenVariants = (set: QuestionSet) => (isTemplated(set) ? Infinity : set.variants.length - set.usedVariants.length);

/** Sets that need AI versions before the next test can be fully fresh. */
export const setsNeedingVersions = (source: MockSource) => source.sets.filter((set) => unseenVariants(set) <= 0);

type Picked = { content: SetContent; variantIndex: number | null; repeated: boolean };

function pickContent(set: QuestionSet, rng: Rng): Picked {
  if (set.templates?.length) {
    const questions = set.templates.map((template) => instantiate(template, rng));
    if (questions.every(Boolean)) return { content: { passage: set.original.passage, questions: questions as StaticQuestion[] }, variantIndex: null, repeated: false };
  }
  const unused = set.variants.map((_, index) => index).filter((index) => !set.usedVariants.includes(index));
  if (unused.length) {
    const variantIndex = unused[Math.floor(rng() * unused.length)];
    return { content: set.variants[variantIndex], variantIndex, repeated: false };
  }
  // Out of fresh versions: reuse one rather than leave a gap in the paper's pattern.
  if (set.variants.length) return { content: set.variants[Math.floor(rng() * set.variants.length)], variantIndex: null, repeated: true };
  return { content: set.original, variantIndex: null, repeated: true };
}

/** Sections in the order the paper has them, with every set in paper order. */
export function paperPattern(source: MockSource) {
  const order: Section[] = [];
  for (const set of source.sets) if (!order.includes(set.section)) order.push(set.section);
  return order.map((section) => {
    const sets = source.sets.filter((set) => set.section === section);
    const topics: Array<{ topic: string; questions: number }> = [];
    for (const set of sets) {
      const last = topics[topics.length - 1];
      if (last?.topic === set.topic) last.questions += set.original.questions.length;
      else topics.push({ topic: set.topic, questions: set.original.questions.length });
    }
    return { section, sets, topics, questions: sets.reduce((sum, set) => sum + set.original.questions.length, 0) };
  });
}

export type BuildOptions = {
  name: string;
  timing: MockTest['timing'];
  /** Minutes per section, by section. */
  durations: Partial<Record<Section, number>>;
  seed?: number;
};

/**
 * Builds a test with exactly the paper's pattern: every set, in order, as a fresh version. Returns the
 * AI versions it used so they can be marked seen, and how many questions had to repeat an earlier version.
 */
export function buildMockTest(source: MockSource, options: BuildOptions) {
  const rng = createRng(options.seed ?? Math.floor(Math.random() * 2 ** 31));
  const usedVariants: Record<string, number> = {};
  let repeated = 0;
  const sections: MockTestSection[] = paperPattern(source).map(({ section, sets }) => {
    const questions: MockQuestion[] = [];
    for (const set of sets) {
      const picked = pickContent(set, rng);
      if (picked.variantIndex !== null) usedVariants[set.id] = picked.variantIndex;
      if (picked.repeated) repeated += picked.content.questions.length;
      for (const question of picked.content.questions) {
        questions.push({ setId: set.id, section: set.section, topic: set.topic, passage: picked.content.passage, ...question });
      }
    }
    return { section, durationSeconds: Math.round((options.durations[section] ?? 20) * 60), questions };
  });
  const test: MockTest = { id: uid('test'), sourceId: source.id, name: options.name, createdAt: Date.now(), timing: options.timing, sections };
  return { test, usedVariants, repeated };
}

export function sectionCounts(source: MockSource) {
  const empty = () => ({ sets: 0, questions: 0, templatedSets: 0, templated: 0, unseen: 0, needVersions: 0 });
  const counts: Record<Section, ReturnType<typeof empty>> = { quant: empty(), reasoning: empty(), english: empty() };
  for (const set of source.sets) {
    const entry = counts[set.section];
    entry.sets++;
    entry.questions += set.original.questions.length;
    if (isTemplated(set)) {
      entry.templatedSets++;
      entry.templated += set.original.questions.length;
    } else {
      entry.unseen += set.variants.length - set.usedVariants.length;
      if (unseenVariants(set) <= 0) entry.needVersions++;
    }
  }
  return counts;
}
