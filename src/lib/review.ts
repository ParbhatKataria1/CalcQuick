import type { AnswerRecord, Question } from '@/types';
import { parsePairs } from '@/lib/factor-pairs';

const DAY_MS = 86_400_000;
/** Days to wait before each review. A miss restarts at the first step; a correct review moves to the next. */
export const REVIEW_INTERVAL_DAYS = [1, 3, 7];

export type ReviewItem = { record: AnswerRecord; dueAt: number };

/**
 * Replays answer history to find facts that were missed and are due for review.
 * Correct answers given before a fact is due don't advance it, so a fact has to
 * be remembered after each gap before it leaves the schedule.
 */
export function getDueReviews(answers: AnswerRecord[], now = Date.now()): ReviewItem[] {
  const schedule = new Map<string, { record: AnswerRecord; step: number; dueAt: number }>();
  const ordered = [...answers].sort((a, b) => a.timestamp - b.timestamp);
  for (const record of ordered) {
    const key = `${record.category}|${record.prompt}`;
    const entry = schedule.get(key);
    if (!record.correct) {
      schedule.set(key, { record, step: 0, dueAt: record.timestamp + REVIEW_INTERVAL_DAYS[0] * DAY_MS });
    } else if (entry && record.timestamp >= entry.dueAt) {
      const step = entry.step + 1;
      if (step >= REVIEW_INTERVAL_DAYS.length) schedule.delete(key);
      else schedule.set(key, { record: entry.record, step, dueAt: record.timestamp + REVIEW_INTERVAL_DAYS[step] * DAY_MS });
    }
  }
  return [...schedule.values()]
    .filter((entry) => entry.dueAt <= now)
    .sort((a, b) => a.dueAt - b.dueAt)
    .map(({ record, dueAt }) => ({ record, dueAt }));
}

export function recordToQuestion(record: AnswerRecord, idPrefix: string, hint?: string): Question {
  const pairs = parsePairs(record.correctAnswer) ?? undefined;
  return {
    pairs,
    id: `${idPrefix}-${record.id}-${Math.random().toString(36).slice(2, 9)}`,
    category: record.category,
    prompt: record.prompt,
    answer: record.correctAnswer,
    numericAnswer: Number.isFinite(Number(record.correctAnswer)) ? Number(record.correctAnswer) : undefined,
    tolerance: record.correctAnswer.includes('.') ? 0.05 : 0,
    hint: hint ?? (pairs ? `Find all ${pairs.length} ${pairs.length === 1 ? 'way' : 'ways'}` : undefined),
  };
}
