import { requireUser } from '@/lib/server/auth';
import { HttpError, readJson, route } from '@/lib/server/http';
import { deleteSource, getSource, saveSource } from '@/lib/server/store';

type Context = { params: Promise<{ id: string }> };

export const GET = route(async (_request: Request, { params }: Context) => {
  const user = await requireUser();
  return Response.json({ source: await getSource(user.id, (await params).id) });
});

/** Renames a paper. */
export const PATCH = route(async (request: Request, { params }: Context) => {
  const user = await requireUser();
  const { name } = await readJson<{ name?: unknown }>(request);
  if (typeof name !== 'string' || !name.trim() || name.length > 120) throw new HttpError('Enter a name of up to 120 characters.');
  const source = await getSource(user.id, (await params).id);
  await saveSource(user.id, { ...source, name: name.trim() });
  return Response.json({ ok: true });
});

export const DELETE = route(async (_request: Request, { params }: Context) => {
  const user = await requireUser();
  await deleteSource(user.id, (await params).id);
  return Response.json({ ok: true });
});
