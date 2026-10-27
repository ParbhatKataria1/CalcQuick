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
const MAX_TRIES = 60;

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

const formatNumber = (value: number) => value.toLocaleString('en-IN', { maximumFractionDigits: 2 });

function fill(text: string, values: Record<string, number>) {
  return text.replace(/\{([a-z_][a-z0-9_]*)\}/gi, (match, name: string) => (Object.hasOwn(values, name) ? formatNumber(values[name]) : match));
}

const formatOption = (template: QuestionTemplate, value: number) =>
  (template.optionFormat.includes('{value}') ? template.optionFormat : '{value}').replace('{value}', formatNumber(value));

/** Fallback wrong options near the answer, for when the AI's distractors collide or fail. */
function nearbyValues(answer: number, format: QuestionTemplate['answerFormat'], rng: Rng) {
  const spread = [0.1, 0.2, 0.25, 0.125, 0.15, 0.3, 0.05];
  return shuffle(spread, rng).flatMap((ratio) => [answer * (1 + ratio), answer * (1 - ratio)]).map((value) => roundTo(value, format)).filter((value) => value > 0);
}

/**
 * Builds one question from a template with fresh numbers. Retries until the answer is clean and
 * all five options are distinct, and returns null when the template never produces a valid question.
 */
export function instantiate(template: QuestionTemplate, rng: Rng): StaticQuestion | null {
  for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
    const values: Record<string, number> = {};
    for (const variable of template.variables) values[variable.name] = sample(variable, rng);
    try {
      const rawAnswer = evaluate(template.answerExpr, values);
      if (!isClean(rawAnswer, template.answerFormat)) continue;
      const answer = roundTo(rawAnswer, template.answerFormat);
      const seen = new Set([formatOption(template, answer)]);
      const wrong: string[] = [];
      const candidates = [
        ...template.distractorExprs.map((expr) => { try { return roundTo(evaluate(expr, values), template.answerFormat); } catch { return NaN; } }),
        ...nearbyValues(answer, template.answerFormat, rng),
      ];
      for (const candidate of candidates) {
        if (wrong.length === OPTION_COUNT - 1) break;
        if (!Number.isFinite(candidate) || candidate <= 0) continue;
        const option = formatOption(template, candidate);
        if (seen.has(option)) continue;
        seen.add(option);
        wrong.push(option);
      }
      if (wrong.length < OPTION_COUNT - 1) continue;
      const correct = formatOption(template, answer);
      const options = shuffle([correct, ...wrong], rng);
      const withAnswer = { ...values, answer };
      return { text: fill(template.text, values), options, answerIndex: options.indexOf(correct), explanation: fill(template.explanation, withAnswer) };
    } catch {
      return null;
    }
  }
  return null;
}

/** True when every template in the set can produce questions; checked once after the PDF is parsed. */
export function templatesWork(templates: QuestionTemplate[]) {
  const rng = createRng(1);
  return templates.every((template) => Array.from({ length: 3 }, () => instantiate(template, rng)).every(Boolean));
}

export const isTemplated = (set: QuestionSet) => Boolean(set.templates?.length);

/** How many unseen versions a set can still give: unlimited for templates, else the unused AI variants. */
export const unseenVariants = (set: QuestionSet) => (isTemplated(set) ? Infinity : set.variants.length - set.usedVariants.length);

type Picked = { set: QuestionSet; content: SetContent; variantIndex: number | null };

function pickContent(set: QuestionSet, rng: Rng): Picked {
  if (set.templates?.length) {
    const questions = set.templates.map((template, index) => instantiate(template, rng) ?? set.original.questions[index]);
    return { set, content: { passage: set.original.passage, questions }, variantIndex: null };
  }
  const unused = set.variants.map((_, index) => index).filter((index) => !set.usedVariants.includes(index));
  const pool = unused.length ? unused : set.variants.map((_, index) => index);
  if (!pool.length) return { set, content: set.original, variantIndex: null };
  const variantIndex = pool[Math.floor(rng() * pool.length)];
  return { set, content: set.variants[variantIndex], variantIndex };
}

export type SectionPlan = { section: Section; questions: number; durationSeconds: number };

export type BuildOptions = {
  name: string;
  timing: MockTest['timing'];
  sections: SectionPlan[];
  seed?: number;
};

/**
 * Picks whole question sets per section until the question target is met, preferring sets with
 * unseen versions, and returns the test plus the variant indexes it used so they can be marked seen.
 */
export function buildMockTest(source: MockSource, options: BuildOptions): { test: MockTest; usedVariants: Record<string, number> } {
  const rng = createRng(options.seed ?? Math.floor(Math.random() * 2 ** 31));
  const usedVariants: Record<string, number> = {};
  const sections: MockTestSection[] = [];

  for (const plan of options.sections) {
    const sets = shuffle(source.sets.filter((set) => set.section === plan.section), rng)
      // Fresh material first; sets whose variants are all used come last.
      .sort((a, b) => Number(unseenVariants(b) > 0) - Number(unseenVariants(a) > 0));
    const questions: MockQuestion[] = [];
    for (const set of sets) {
      if (questions.length >= plan.questions) break;
      // Sets stay whole, so skip one that would overshoot the target.
      if (questions.length + set.original.questions.length > plan.questions) continue;
      const picked = pickContent(set, rng);
      if (picked.variantIndex !== null) usedVariants[set.id] = picked.variantIndex;
      for (const question of picked.content.questions) {
        questions.push({ setId: set.id, section: set.section, topic: set.topic, passage: picked.content.passage, ...question });
      }
    }
    if (questions.length) sections.push({ section: plan.section, durationSeconds: plan.durationSeconds, questions });
  }

  return {
    test: { id: uid('test'), sourceId: source.id, name: options.name, createdAt: Date.now(), timing: options.timing, sections },
    usedVariants,
  };
}

export function sectionCounts(source: MockSource) {
  const empty = () => ({ sets: 0, questions: 0, templatedSets: 0, templated: 0, unseen: 0 });
  const counts: Record<Section, ReturnType<typeof empty>> = { quant: empty(), reasoning: empty(), english: empty() };
  for (const set of source.sets) {
    const entry = counts[set.section];
    entry.sets++;
    entry.questions += set.original.questions.length;
    if (isTemplated(set)) {
      entry.templatedSets++;
      entry.templated += set.original.questions.length;
    }
    else entry.unseen += set.variants.length - set.usedVariants.length;
  }
  return counts;
}
