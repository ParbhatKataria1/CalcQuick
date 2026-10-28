import { requireUser } from '@/lib/server/auth';
import { HttpError, readJson, route } from '@/lib/server/http';
import { updateStats } from '@/lib/server/store';
import { defaultStats } from '@/lib/stats';
import type { AppStats } from '@/types';

/** One-time import of progress that was kept in the browser before accounts existed. */
export const POST = route(async (request: Request) => {
  const user = await requireUser();
  const { stats: incoming } = await readJson<{ stats?: AppStats }>(request);
  if (!incoming || !Array.isArray(incoming.sessions) || !Array.isArray(incoming.answers)) throw new HttpError('Nothing to import.');
  // Only an account without progress takes an import, so it can never overwrite real data.
  const stats = await updateStats(user.id, (previous) => (previous.sessions.length ? previous : { ...defaultStats, ...incoming }));
  return Response.json({ stats });
});
