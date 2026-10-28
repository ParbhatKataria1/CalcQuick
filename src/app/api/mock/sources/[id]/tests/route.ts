import { requireUser } from '@/lib/server/auth';
import { HttpError, readJson, route } from '@/lib/server/http';
import { getSource, listTests, saveSource, saveTest } from '@/lib/server/store';
import { buildMockTest } from '@/lib/mock-generator';
import { SECTIONS, type MockTest, type Section } from '@/types/mock-test';

/** Generates a new test with the paper's exact pattern and marks the AI versions it used as seen. */
export const POST = route(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const body = await readJson<{ timing?: MockTest['timing']; minutes?: Partial<Record<Section, number>> }>(request);
  const durations: Partial<Record<Section, number>> = {};
  for (const section of SECTIONS) {
    const minutes = Number(body.minutes?.[section]);
    if (Number.isFinite(minutes)) durations[section] = Math.min(240, Math.max(1, minutes));
  }

  const source = await getSource(user.id, (await params).id);
  const testNumber = (await listTests(user.id)).filter((test) => test.sourceId === source.id).length + 1;
  const { test, usedVariants, repeated } = buildMockTest(source, { name: `${source.name} · Test ${testNumber}`, timing: body.timing === 'composite' ? 'composite' : 'sectional', durations });
  if (!test.sections.length) throw new HttpError('This paper has no questions.');

  await saveTest(user.id, test);
  if (Object.keys(usedVariants).length) {
    const sets = source.sets.map((set) => (set.id in usedVariants ? { ...set, usedVariants: [...new Set([...set.usedVariants, usedVariants[set.id]])] } : set));
    await saveSource(user.id, { ...source, sets });
  }
  return Response.json({ id: test.id, repeated }, { status: 201 });
});
