import { requireUser } from '@/lib/server/auth';
import { HttpError, readJson, route } from '@/lib/server/http';
import { deleteSource, getSource, saveSource } from '@/lib/server/store';
import { cleanUpImport } from '@/lib/server/paper-import';

type Context = { params: Promise<{ id: string }> };

export const GET = route(async (_request: Request, { params }: Context) => {
  const user = await requireUser();
  const source = await getSource(user.id, (await params).id);
  // Where the PDF is stored and its Gemini uploads are server business.
  const importState = source.importState && { status: source.importState.status, chunks: source.importState.chunks, skipped: source.importState.skipped };
  return Response.json({ source: { ...source, importState } });
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
  const { id } = await params;
  // A paper still being read has its PDF stored, possibly also uploaded to Gemini.
  await cleanUpImport((await getSource(user.id, id).catch(() => null))?.importState);
  await deleteSource(user.id, id);
  return Response.json({ ok: true });
});
