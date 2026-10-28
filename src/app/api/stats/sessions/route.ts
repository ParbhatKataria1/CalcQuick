import { requireUser } from '@/lib/server/auth';
import { HttpError, readJson, route } from '@/lib/server/http';
import { updateStats } from '@/lib/server/store';
import { applySession } from '@/lib/stats';
import type { AnswerRecord, SessionRecord } from '@/types';

const MAX_ANSWERS = 1000;

/** Records a finished practice session. */
export const POST = route(async (request: Request) => {
  const user = await requireUser();
  const body = await readJson<{ session?: SessionRecord; answers?: AnswerRecord[]; durationSeconds?: number; timezoneOffsetMinutes?: number }>(request);
  const { session, answers } = body;
  if (!session || typeof session.id !== 'string' || !Array.isArray(answers) || answers.length > MAX_ANSWERS) throw new HttpError('Invalid session.');
  const offset = Number(body.timezoneOffsetMinutes);
  const stats = await updateStats(user.id, (previous) =>
    // A retried request must not count the same session twice.
    previous.sessions.some((item) => item.id === session.id)
      ? previous
      : applySession(previous, session, answers, typeof body.durationSeconds === 'number' ? body.durationSeconds : undefined, Number.isFinite(offset) && Math.abs(offset) <= 840 ? offset : 0));
  return Response.json({ stats });
});
