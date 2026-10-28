import { requireUser } from '@/lib/server/auth';
import { HttpError, readJson, route } from '@/lib/server/http';
import { deleteAttempt, getAttempt, getTest, saveAttempt } from '@/lib/server/store';
import { scoreAttempt } from '@/lib/mock-scoring';
import type { MockAttempt, QuestionResponse, QuestionStatus } from '@/types/mock-test';

type Context = { params: Promise<{ id: string }> };

const STATUSES: QuestionStatus[] = ['notVisited', 'notAnswered', 'answered', 'marked', 'answeredMarked'];

export const GET = route(async (_request: Request, { params }: Context) => {
  const user = await requireUser();
  return Response.json({ attempt: await getAttempt(user.id, (await params).id) });
});

/** Autosaves progress, or submits with `submit: true`. The score is always worked out here, not trusted from the browser. */
export const PATCH = route(async (request: Request, { params }: Context) => {
  const user = await requireUser();
  const attempt = await getAttempt(user.id, (await params).id);
  if (attempt.endedAt) throw new HttpError('This test has already been submitted.', 409);
  const test = await getTest(user.id, attempt.testId);
  const body = await readJson<Partial<Pick<MockAttempt, 'responses' | 'remainingSeconds' | 'currentSection'>> & { submit?: boolean }>(request);

  const responses = Array.isArray(body.responses) ? body.responses : attempt.responses;
  const shapeMatches = responses.length === test.sections.length && test.sections.every((section, index) =>
    Array.isArray(responses[index]) && responses[index].length === section.questions.length &&
    responses[index].every((response: QuestionResponse, question) => STATUSES.includes(response?.status) && Number.isFinite(response.timeMs) &&
      (response.selected === null || (Number.isInteger(response.selected) && response.selected >= 0 && response.selected < section.questions[question].options.length))));
  if (!shapeMatches) throw new HttpError('Responses do not match this test.');

  const next: MockAttempt = {
    ...attempt,
    responses,
    remainingSeconds: Array.isArray(body.remainingSeconds) && body.remainingSeconds.length === attempt.remainingSeconds.length ? body.remainingSeconds.map((value) => Math.max(0, Number(value) || 0)) : attempt.remainingSeconds,
    currentSection: Number.isInteger(body.currentSection) ? Math.min(Math.max(0, body.currentSection!), test.sections.length - 1) : attempt.currentSection,
  };
  if (body.submit) Object.assign(next, { endedAt: Date.now() }, scoreAttempt(test, responses));
  // Autosaves only change the attempt itself; the list entry changes on submit.
  await saveAttempt(user.id, next, { updateIndex: Boolean(body.submit) });
  return Response.json({ attempt: next });
});

/** Deletes an attempt with its test. */
export const DELETE = route(async (_request: Request, { params }: Context) => {
  const user = await requireUser();
  await deleteAttempt(user.id, (await params).id);
  return Response.json({ ok: true });
});
