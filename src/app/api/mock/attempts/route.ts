import { requireUser } from '@/lib/server/auth';
import { HttpError, readJson, route } from '@/lib/server/http';
import { getAttempt, getTest, listAttempts, saveAttempt } from '@/lib/server/store';
import { uid } from '@/lib/mock-generator';
import { newResponses } from '@/lib/mock-scoring';

/** Lists attempts, optionally only those for one paper or one test. */
export const GET = route(async (request: Request) => {
  const user = await requireUser();
  const url = new URL(request.url);
  const sourceId = url.searchParams.get('sourceId');
  const testId = url.searchParams.get('testId');
  const attempts = (await listAttempts(user.id)).filter((attempt) => (!sourceId || attempt.sourceId === sourceId) && (!testId || attempt.testId === testId));
  return Response.json({ attempts });
});

/** Starts a test. A test has one attempt, so starting it again returns the existing one. */
export const POST = route(async (request: Request) => {
  const user = await requireUser();
  const { testId } = await readJson<{ testId?: string }>(request);
  if (!testId) throw new HttpError('Choose a test.');
  const existing = (await listAttempts(user.id)).find((attempt) => attempt.testId === testId);
  if (existing) return Response.json({ attempt: await getAttempt(user.id, existing.id) });

  const test = await getTest(user.id, testId);
  const totalSeconds = test.sections.reduce((sum, section) => sum + section.durationSeconds, 0);
  const attempt = await saveAttempt(user.id, {
    id: uid('attempt'),
    testId: test.id,
    sourceId: test.sourceId,
    testName: test.name,
    startedAt: Date.now(),
    endedAt: null,
    responses: newResponses(test),
    remainingSeconds: test.timing === 'sectional' ? test.sections.map((section) => section.durationSeconds) : [totalSeconds],
    currentSection: 0,
    sectionScores: [],
    score: 0,
    maxScore: test.sections.reduce((sum, section) => sum + section.questions.length, 0),
  }, { updateIndex: true });
  return Response.json({ attempt }, { status: 201 });
});
