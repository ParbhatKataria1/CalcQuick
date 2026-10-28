import 'server-only';
import { HttpError } from '@/lib/server/http';
import { kv } from '@/lib/server/kv';
import { defaultStats } from '@/lib/stats';
import { sectionCounts } from '@/lib/mock-generator';
import type { AppStats } from '@/types';
import type { AttemptSummary, MockAttempt, MockSource, MockTest, SourceSummary, TestSummary } from '@/types/mock-test';

/**
 * Every key is scoped to one user, so a request can only ever reach its own data. Lists are kept
 * as small index records next to the full documents, so listing never loads whole papers.
 */
const keys = {
  stats: (userId: string) => `stats:${userId}`,
  sources: (userId: string) => `mock:${userId}:sources`,
  source: (userId: string, id: string) => `mock:${userId}:source:${id}`,
  tests: (userId: string) => `mock:${userId}:tests`,
  test: (userId: string, id: string) => `mock:${userId}:test:${id}`,
  attempts: (userId: string) => `mock:${userId}:attempts`,
  attempt: (userId: string, id: string) => `mock:${userId}:attempt:${id}`,
};

export const sizeOf = (value: unknown) => new TextEncoder().encode(JSON.stringify(value)).length;

async function required<T>(key: string, what: string) {
  const value = await kv.get<T>(key);
  if (!value) throw new HttpError(`${what} not found.`, 404);
  return value;
}

const list = async <T>(key: string) => (await kv.get<T[]>(key)) ?? [];

async function upsertIndex<T extends { id: string }>(key: string, entry: T) {
  const items = await list<T>(key);
  const index = items.findIndex((item) => item.id === entry.id);
  if (index === -1) items.unshift(entry);
  else items[index] = entry;
  await kv.set(key, items);
}

async function removeFromIndex<T extends { id: string }>(key: string, ids: Set<string>) {
  await kv.set(key, (await list<T>(key)).filter((item) => !ids.has(item.id)));
}

// Practice stats

export const getStats = async (userId: string) => ({ ...defaultStats, ...(await kv.get<AppStats>(keys.stats(userId))) });
export const putStats = (userId: string, stats: AppStats) => kv.set(keys.stats(userId), stats);

/** Applies a change to the saved stats and returns the result. */
export async function updateStats(userId: string, change: (stats: AppStats) => AppStats) {
  const next = change(await getStats(userId));
  await putStats(userId, next);
  return next;
}

// Mock papers

const summarizeSource = (source: MockSource): SourceSummary => {
  const counts = sectionCounts(source);
  return {
    id: source.id,
    name: source.name,
    fileName: source.fileName,
    createdAt: source.createdAt,
    questions: { quant: counts.quant.questions, reasoning: counts.reasoning.questions, english: counts.english.questions },
    bytes: sizeOf(source),
    status: source.importState?.status ?? 'ready',
  };
};

export const listSources = (userId: string) => list<SourceSummary>(keys.sources(userId));
export const getSource = (userId: string, id: string) => required<MockSource>(keys.source(userId, id), 'Paper');

export async function saveSource(userId: string, source: MockSource) {
  await kv.set(keys.source(userId, source.id), source);
  await upsertIndex(keys.sources(userId), summarizeSource(source));
  return source;
}

/** Deletes a paper with every test generated from it and every attempt at those tests. */
export async function deleteSource(userId: string, id: string) {
  const tests = (await list<TestSummary>(keys.tests(userId))).filter((test) => test.sourceId === id);
  const attempts = (await list<AttemptSummary>(keys.attempts(userId))).filter((attempt) => attempt.sourceId === id);
  await kv.del(keys.source(userId, id), ...tests.map((test) => keys.test(userId, test.id)), ...attempts.map((attempt) => keys.attempt(userId, attempt.id)));
  await removeFromIndex(keys.sources(userId), new Set([id]));
  await removeFromIndex(keys.tests(userId), new Set(tests.map((test) => test.id)));
  await removeFromIndex(keys.attempts(userId), new Set(attempts.map((attempt) => attempt.id)));
}

// Generated tests

export const listTests = (userId: string) => list<TestSummary>(keys.tests(userId));
export const getTest = (userId: string, id: string) => required<MockTest>(keys.test(userId, id), 'Test');

export async function saveTest(userId: string, test: MockTest) {
  await kv.set(keys.test(userId, test.id), test);
  await upsertIndex<TestSummary>(keys.tests(userId), { id: test.id, sourceId: test.sourceId, name: test.name, createdAt: test.createdAt, bytes: sizeOf(test) });
  return test;
}

// Attempts

const summarizeAttempt = (attempt: MockAttempt, testBytes: number): AttemptSummary => ({
  id: attempt.id,
  testId: attempt.testId,
  sourceId: attempt.sourceId,
  testName: attempt.testName,
  startedAt: attempt.startedAt,
  endedAt: attempt.endedAt,
  score: attempt.score,
  maxScore: attempt.maxScore,
  bytes: sizeOf(attempt) + testBytes,
});

export const listAttempts = (userId: string) => list<AttemptSummary>(keys.attempts(userId));
export const getAttempt = (userId: string, id: string) => required<MockAttempt>(keys.attempt(userId, id), 'Attempt');

/** Saves an attempt; the index is only rewritten when something it shows has changed. */
export async function saveAttempt(userId: string, attempt: MockAttempt, options: { updateIndex: boolean }) {
  await kv.set(keys.attempt(userId, attempt.id), attempt);
  if (options.updateIndex) {
    const test = (await listTests(userId)).find((item) => item.id === attempt.testId);
    await upsertIndex(keys.attempts(userId), summarizeAttempt(attempt, test?.bytes ?? 0));
  }
  return attempt;
}

/** Deletes an attempt together with its test, which only that attempt used. */
export async function deleteAttempt(userId: string, id: string) {
  const attempt = await getAttempt(userId, id);
  await kv.del(keys.attempt(userId, id), keys.test(userId, attempt.testId));
  await removeFromIndex(keys.attempts(userId), new Set([id]));
  await removeFromIndex(keys.tests(userId), new Set([attempt.testId]));
}

export async function storageUsage(userId: string) {
  const [stats, sources, tests, attempts] = await Promise.all([kv.get<AppStats>(keys.stats(userId)), listSources(userId), listTests(userId), listAttempts(userId)]);
  const attemptedTests = new Set(attempts.map((attempt) => attempt.testId));
  return {
    practice: { bytes: stats ? sizeOf(stats) : 0, sessions: stats?.sessions.length ?? 0, answers: stats?.answers.length ?? 0 },
    sources,
    attempts,
    // Tests generated but never started; they are removed with their paper.
    unstartedTests: tests.filter((test) => !attemptedTests.has(test.id)),
  };
}

export async function deleteUnstartedTests(userId: string) {
  const { unstartedTests } = await storageUsage(userId);
  await kv.del(...unstartedTests.map((test) => keys.test(userId, test.id)));
  await removeFromIndex(keys.tests(userId), new Set(unstartedTests.map((test) => test.id)));
  return unstartedTests.length;
}
