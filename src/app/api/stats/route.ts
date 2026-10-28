import { requireUser } from '@/lib/server/auth';
import { readJson, route } from '@/lib/server/http';
import { getStats, updateStats } from '@/lib/server/store';
import { defaultStats } from '@/lib/stats';

export const GET = route(async () => {
  const user = await requireUser();
  return Response.json({ stats: await getStats(user.id) });
});

/** Preferences stored with the progress. */
export const PATCH = route(async (request: Request) => {
  const user = await requireUser();
  const body = await readJson<{ soundEnabled?: unknown }>(request);
  const stats = await updateStats(user.id, (previous) => (typeof body.soundEnabled === 'boolean' ? { ...previous, soundEnabled: body.soundEnabled } : previous));
  return Response.json({ stats });
});

/** Resets all practice progress, keeping preferences. */
export const DELETE = route(async () => {
  const user = await requireUser();
  const stats = await updateStats(user.id, (previous) => ({ ...defaultStats, soundEnabled: previous.soundEnabled }));
  return Response.json({ stats });
});
