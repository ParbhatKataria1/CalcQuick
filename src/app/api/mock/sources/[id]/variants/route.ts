import { requireUser } from '@/lib/server/auth';
import { VARIANT_SETS_PER_REQUEST, writeVariants } from '@/lib/gemini';
import { HttpError, readJson, route } from '@/lib/server/http';
import { getSource, saveSource } from '@/lib/server/store';
import { isTemplated, setsNeedingVersions } from '@/lib/mock-generator';
import { SECTIONS, type Section } from '@/types/mock-test';

export const maxDuration = 300;

/**
 * Writes and reviews new versions for a few sets, from their JSON only (the PDF is not sent again).
 * By default it takes the sets that have no unseen version left; with `section` it adds more to that section.
 * The browser calls this repeatedly until `remaining` is 0, so no single request runs long, passing back
 * `failedSetIds` as `skip` so a set whose versions keep failing review isn't retried forever.
 */
export const POST = route(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { section, skip } = await readJson<{ section?: Section; skip?: string[] }>(request);
  const skipped = new Set(Array.isArray(skip) ? skip : []);
  if (section !== undefined && !SECTIONS.includes(section)) throw new HttpError('Unknown section.');
  const source = await getSource(user.id, (await params).id);
  const pool = section
    ? source.sets.filter((set) => set.section === section && !isTemplated(set)).sort((a, b) => (a.variants.length - a.usedVariants.length) - (b.variants.length - b.usedVariants.length))
    : setsNeedingVersions(source).filter((set) => !skipped.has(set.id));
  const targets = pool.slice(0, VARIANT_SETS_PER_REQUEST);
  if (!targets.length) return Response.json({ added: 0, rejected: [], remaining: 0 });

  const { accepted, rejected } = await writeVariants(targets);
  // Re-read before saving, so versions marked as seen while Gemini was working are kept.
  const latest = await getSource(user.id, source.id);
  const sets = latest.sets.map((set) => (accepted[set.id]?.length ? { ...set, variants: [...set.variants, ...accepted[set.id]] } : set));
  await saveSource(user.id, { ...latest, sets });
  const failedSetIds = targets.filter((set) => !accepted[set.id]?.length).map((set) => set.id);
  const remaining = section ? 0 : pool.length - targets.length;
  return Response.json({ added: Object.values(accepted).reduce((sum, items) => sum + items.length, 0), rejected, remaining, failedSetIds });
});
