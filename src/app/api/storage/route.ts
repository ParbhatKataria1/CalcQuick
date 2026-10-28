import { requireUser } from '@/lib/server/auth';
import { HttpError, route } from '@/lib/server/http';
import { deleteAttempt, deleteUnstartedTests, listAttempts, storageUsage } from '@/lib/server/store';

/** What the account stores and how big each part is, for the Settings page. */
export const GET = route(async () => {
  const user = await requireUser();
  return Response.json(await storageUsage(user.id));
});

/** Bulk clean-up: `?what=attempts` (all mock test attempts) or `?what=unstartedTests`. */
export const DELETE = route(async (request: Request) => {
  const user = await requireUser();
  const what = new URL(request.url).searchParams.get('what');
  if (what === 'unstartedTests') return Response.json({ deleted: await deleteUnstartedTests(user.id) });
  if (what === 'attempts') {
    const attempts = await listAttempts(user.id);
    for (const attempt of attempts) await deleteAttempt(user.id, attempt.id);
    return Response.json({ deleted: attempts.length });
  }
  throw new HttpError('Unknown clean-up.');
});
