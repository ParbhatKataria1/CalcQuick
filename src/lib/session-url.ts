import type { AppStats, CategoryId, Difficulty, Question, SessionConfig } from '@/types';
import { categories } from '@/constants/categories';
import { multiplyDivideTechniques } from '@/constants/multiply-divide-techniques';
import { generateBankingTechniqueSet, generateMultiplyDivideSet, type BankingTechnique, type MultiplyDivideTechnique } from '@/lib/question-generator';
import { generateNumberFactSet, getMissedPrompts, getPracticeValues, numberFactConfig, type FactDirection, type NumberFactKind } from '@/lib/number-fact-generator';
import { fractionCategories, fractionSets, generateFractionSet, type FractionDirection, type FractionSetId } from '@/lib/fraction-facts';
import { recordToQuestion } from '@/lib/review';

/**
 * Every practice session is described by its URL, so setup, session and result screens each
 * have their own address. A session page rebuilds the questions from these settings.
 */
export type SessionSpec =
  | { kind: 'practice'; category: CategoryId; difficulty: Difficulty; count: number | 'endless'; weak: boolean }
  | { kind: 'speed'; duration: number; difficulty: Difficulty }
  | { kind: 'daily' }
  | { kind: 'mistakes' }
  | { kind: 'banking'; techniques: BankingTechnique[]; difficulty: Difficulty; count: number; digits: 1 | 2 | 3 }
  | { kind: 'multiplyDivide'; techniques: MultiplyDivideTechnique[]; difficulty: Difficulty; count: number }
  | { kind: 'numberFacts'; fact: NumberFactKind; from: number; to: number; count: number; direction: FactDirection }
  | { kind: 'fractions'; sets: FractionSetId[]; direction: FractionDirection; count: number };

export type SessionKind = SessionSpec['kind'];

export type BuiltSession = {
  config: SessionConfig;
  initialQuestions?: Question[];
  repeatMistakes: boolean;
  reviewDue: boolean;
};

export const SPEED_DURATIONS = [60, 120, 300, 600];
export const BANKING_TECHNIQUES: BankingTechnique[] = ['complements', 'compensation', 'leftToRight', 'pairing', 'chunking'];
const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];
const COUNTS = [10, 20, 30, 50];

const oneOf = <T,>(value: string | null, allowed: readonly T[], fallback: T): T =>
  (allowed as readonly unknown[]).includes(value) ? (value as T) : fallback;
const numberOf = <T extends number>(value: string | null, allowed: readonly T[], fallback: T): T => {
  const parsed = Number(value);
  return allowed.includes(parsed as T) ? (parsed as T) : fallback;
};
const listOf = <T,>(value: string | null, allowed: readonly T[], fallback: T[]): T[] => {
  const items = (value ?? '').split(',').filter((item) => (allowed as readonly unknown[]).includes(item)) as T[];
  return items.length ? [...new Set(items)] : fallback;
};

/** The query string for a session URL. The route itself decides the kind. */
export function specToQuery(spec: SessionSpec): string {
  const params = new URLSearchParams();
  switch (spec.kind) {
    case 'practice':
      if (spec.weak) params.set('weak', '1');
      params.set('cat', spec.category);
      params.set('diff', spec.difficulty);
      params.set('n', String(spec.count));
      break;
    case 'speed':
      params.set('duration', String(spec.duration));
      params.set('diff', spec.difficulty);
      break;
    case 'banking':
      params.set('t', spec.techniques.join(','));
      params.set('diff', spec.difficulty);
      params.set('n', String(spec.count));
      params.set('digits', String(spec.digits));
      break;
    case 'multiplyDivide':
      params.set('t', spec.techniques.length === multiplyDivideTechniques.length ? 'all' : spec.techniques.join(','));
      params.set('diff', spec.difficulty);
      params.set('n', String(spec.count));
      break;
    case 'numberFacts':
      params.set('from', String(spec.from));
      params.set('to', String(spec.to));
      params.set('n', String(spec.count));
      params.set('dir', spec.direction);
      break;
    case 'fractions':
      params.set('sets', spec.sets.join(','));
      params.set('dir', spec.direction);
      params.set('n', String(spec.count));
      break;
  }
  return params.toString();
}

/** Route segments that pin part of a session, such as a lesson's technique. */
export type SessionRouteParams = { fact?: NumberFactKind; technique?: string };

/** Reads a session URL back into settings, falling back to defaults for anything missing or invalid. */
export function specFromQuery(kind: SessionKind, params: URLSearchParams, route: SessionRouteParams = {}): SessionSpec {
  const difficulty = oneOf(params.get('diff'), DIFFICULTIES, 'medium');
  switch (kind) {
    case 'practice': {
      const weak = params.get('weak') === '1';
      const rawCount = params.get('n');
      return {
        kind,
        weak,
        category: weak ? 'mixed' : oneOf(params.get('cat'), categories.map((item) => item.id), 'tables'),
        difficulty,
        count: rawCount === 'endless' ? 'endless' : numberOf(rawCount, COUNTS, 20),
      };
    }
    case 'speed':
      return { kind, duration: numberOf(params.get('duration'), SPEED_DURATIONS, 120), difficulty };
    case 'daily':
    case 'mistakes':
      return { kind };
    case 'banking':
      return {
        kind,
        techniques: listOf(route.technique ?? params.get('t'), BANKING_TECHNIQUES, BANKING_TECHNIQUES),
        difficulty,
        count: numberOf(params.get('n'), COUNTS, route.technique ? 10 : 20),
        digits: numberOf(params.get('digits'), [1, 2, 3] as const, 3),
      };
    case 'multiplyDivide': {
      const ids = multiplyDivideTechniques.map((item) => item.id);
      return { kind, techniques: listOf(route.technique ?? params.get('t'), ids, ids), difficulty, count: numberOf(params.get('n'), COUNTS, route.technique ? 10 : 20) };
    }
    case 'numberFacts': {
      const fact = route.fact ?? 'tables';
      const values = getPracticeValues(fact);
      const from = numberOf(params.get('from'), values, values[0]);
      const to = numberOf(params.get('to'), values, values[values.length - 1]);
      return {
        kind,
        fact,
        from: Math.min(from, to),
        to: Math.max(from, to),
        count: numberOf(params.get('n'), COUNTS, 20),
        direction: oneOf(params.get('dir'), ['forward', 'reverse', 'both'] as const, 'forward'),
      };
    }
    case 'fractions':
      return {
        kind,
        sets: listOf(params.get('sets'), fractionSets.map((set) => set.id), ['unit', 'multiples']),
        direction: oneOf(params.get('dir'), ['toPercent', 'toFraction', 'both'] as const, 'both'),
        count: numberOf(params.get('n'), COUNTS, 20),
      };
  }
}

const dateKey = (timestamp: number) => new Date(timestamp).toLocaleDateString('en-CA');

/** Builds the engine input for a session. Returns null when there is nothing to practise. */
export function buildSession(spec: SessionSpec, stats: AppStats): BuiltSession | null {
  switch (spec.kind) {
    case 'practice':
      return {
        config: { category: spec.category, difficulty: spec.difficulty, questionCount: spec.count, mode: spec.weak ? 'weak' : 'practice' },
        repeatMistakes: false,
        reviewDue: true,
      };
    case 'speed':
      return {
        config: { category: 'mixed', difficulty: spec.difficulty, questionCount: 'endless', durationSeconds: spec.duration, mode: 'speed' },
        repeatMistakes: false,
        reviewDue: true,
      };
    case 'daily': {
      const today = dateKey(Date.now());
      const todayQuestions = stats.sessions.filter((session) => dateKey(session.endedAt) === today).reduce((sum, session) => sum + session.total, 0);
      return {
        config: { category: 'mixed', difficulty: 'medium', questionCount: Math.max(10, 50 - todayQuestions), mode: 'daily' },
        repeatMistakes: false,
        reviewDue: true,
      };
    }
    case 'mistakes': {
      const questions = [...stats.answers].filter((answer) => !answer.correct).reverse().slice(0, 20).map((record) => recordToQuestion(record, 'mistake'));
      if (!questions.length) return null;
      return {
        config: { category: 'mixed', difficulty: 'medium', questionCount: questions.length, mode: 'mistakes' },
        initialQuestions: questions,
        repeatMistakes: false,
        reviewDue: false,
      };
    }
    case 'banking':
      return {
        config: { category: 'banking', difficulty: spec.difficulty, questionCount: spec.count, mode: 'banking' },
        initialQuestions: generateBankingTechniqueSet(spec.techniques, spec.count, spec.difficulty, spec.digits),
        repeatMistakes: false,
        reviewDue: true,
      };
    case 'multiplyDivide': {
      const questions = generateMultiplyDivideSet(spec.techniques, spec.count, spec.difficulty);
      return {
        config: { category: spec.techniques.length === 1 ? questions[0].category : 'mixed', difficulty: spec.difficulty, questionCount: spec.count, mode: 'banking' },
        initialQuestions: questions,
        repeatMistakes: false,
        reviewDue: true,
      };
    }
    case 'numberFacts': {
      const { category } = numberFactConfig[spec.fact];
      return {
        config: { category, difficulty: 'medium', questionCount: spec.count, mode: 'practice' },
        initialQuestions: generateNumberFactSet(spec.fact, spec.from, spec.to, spec.count, spec.direction, getMissedPrompts([category], stats.answers)),
        repeatMistakes: true,
        reviewDue: false,
      };
    }
    case 'fractions': {
      const category = spec.direction === 'both' ? 'mixed' : fractionCategories[spec.direction];
      return {
        config: { category, difficulty: 'medium', questionCount: spec.count, mode: 'practice' },
        initialQuestions: generateFractionSet(spec.sets, spec.direction, spec.count, getMissedPrompts(Object.values(fractionCategories), stats.answers)),
        repeatMistakes: true,
        reviewDue: false,
      };
    }
  }
}

/** Replays the missed questions of a finished session. The retry ends after them instead of topping up with new ones. */
export function buildRetrySession(sessionId: string, stats: AppStats, repeatMistakes: boolean): BuiltSession | null {
  const session = stats.sessions.find((item) => item.id === sessionId);
  if (!session) return null;
  const missed = stats.answers.filter((answer) => answer.sessionId === sessionId && !answer.correct);
  const questions = [...new Map(missed.map((record) => [record.prompt, record])).values()].map((record) => recordToQuestion(record, 'retry'));
  if (!questions.length) return null;
  return {
    config: { category: session.category, difficulty: session.difficulty, questionCount: questions.length, mode: session.mode },
    initialQuestions: questions,
    repeatMistakes,
    reviewDue: false,
  };
}
