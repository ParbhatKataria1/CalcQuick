import { requireUser } from '@/lib/server/auth';
import { HttpError, readJson, route } from '@/lib/server/http';
import { getSource, listTests, saveSource, saveTest } from '@/lib/server/store';
import { buildMockTest, type SectionPlan } from '@/lib/mock-generator';
import { SECTIONS, type MockTest } from '@/types/mock-test';

/** Generates a new test from a paper and marks the AI versions it used as seen. */
export const POST = route(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const body = await readJson<{ timing?: MockTest['timing']; sections?: SectionPlan[] }>(request);
  const sections = (Array.isArray(body.sections) ? body.sections : [])
    .filter((plan) => SECTIONS.includes(plan?.section))
    .map((plan) => ({ section: plan.section, questions: Math.min(200, Math.max(1, Math.round(Number(plan.questions)) || 1)), durationSeconds: Math.min(4 * 3600, Math.max(60, Math.round(Number(plan.durationSeconds)) || 60)) }));
  if (!sections.length) throw new HttpError('Choose at least one section.');

  const source = await getSource(user.id, (await params).id);
  const testNumber = (await listTests(user.id)).filter((test) => test.sourceId === source.id).length + 1;
  const { test, usedVariants } = buildMockTest(source, { name: `${source.name} · Test ${testNumber}`, timing: body.timing === 'composite' ? 'composite' : 'sectional', sections });
  if (!test.sections.length) throw new HttpError('No questions fit this pattern. Try more questions per section.');

  await saveTest(user.id, test);
  if (Object.keys(usedVariants).length) {
    const sets = source.sets.map((set) => (set.id in usedVariants ? { ...set, usedVariants: [...new Set([...set.usedVariants, usedVariants[set.id]])] } : set));
    await saveSource(user.id, { ...source, sets });
  }
  return Response.json({ id: test.id }, { status: 201 });
});
