import { requireUser } from '@/lib/server/auth';
import { route } from '@/lib/server/http';
import { getTest } from '@/lib/server/store';

export const GET = route(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  return Response.json({ test: await getTest(user.id, (await params).id) });
});
