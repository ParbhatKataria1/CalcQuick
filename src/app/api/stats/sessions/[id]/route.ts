import { requireUser } from '@/lib/server/auth';
import { route } from '@/lib/server/http';
import { updateStats } from '@/lib/server/store';
import { removeSession } from '@/lib/stats';

export const DELETE = route(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await params;
  return Response.json({ stats: await updateStats(user.id, (previous) => removeSession(previous, id)) });
});
