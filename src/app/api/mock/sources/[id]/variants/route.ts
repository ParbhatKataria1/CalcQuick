import { requireUser } from '@/lib/server/auth';
import { writeVariants } from '@/lib/gemini';
import { HttpError, readJson, route } from '@/lib/server/http';
import { getSource, saveSource } from '@/lib/server/store';
import { isTemplated } from '@/lib/mock-generator';
import { SECTIONS, type Section } from '@/types/mock-test';

export const maxDuration = 300;

/** Sets rewritten per click: the ones with the fewest unseen versions. */
const SETS_PER_REQUEST = 20;

/** Asks Gemini for more versions of a section's sets, from their JSON only — the PDF is not sent again. */
export const POST = route(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { section } = await readJson<{ section?: Section }>(request);
  if (!section || !SECTIONS.includes(section)) throw new HttpError('Choose a section.');
  const source = await getSource(user.id, (await params).id);
  const targets = source.sets
    .filter((set) => set.section === section && !isTemplated(set))
    .sort((a, b) => (a.variants.length - a.usedVariants.length) - (b.variants.length - b.usedVariants.length))
    .slice(0, SETS_PER_REQUEST);
  if (!targets.length) throw new HttpError('This section has no sets that need new versions.');

  const variants = await writeVariants(targets);
  // Re-read before saving, so versions marked as seen while Gemini was working are kept.
  const latest = await getSource(user.id, source.id);
  const sets = latest.sets.map((set) => (variants[set.id]?.length ? { ...set, variants: [...set.variants, ...variants[set.id]] } : set));
  await saveSource(user.id, { ...latest, sets });
  return Response.json({ added: Object.values(variants).reduce((sum, items) => sum + items.length, 0) });
});
