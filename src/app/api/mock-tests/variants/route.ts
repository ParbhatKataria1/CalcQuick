import { MockApiError, errorResponse, writeVariants } from '@/lib/gemini';
import type { QuestionSet } from '@/types/mock-test';

export const maxDuration = 300;

const MAX_SETS = 40;

/** Writes more versions of the given sets, from their JSON only — the PDF is not sent again. */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null) as { sets?: QuestionSet[]; count?: number } | null;
    const sets = Array.isArray(body?.sets) ? body.sets.filter((set) => set?.id && set.original?.questions?.length) : [];
    if (!sets.length) throw new MockApiError('No question sets to rewrite.', 400);
    if (sets.length > MAX_SETS) throw new MockApiError(`Send at most ${MAX_SETS} sets at a time.`, 400);
    const count = Math.min(3, Math.max(1, Number(body?.count) || 2));
    return Response.json({ variants: await writeVariants(sets, count) });
  } catch (error) {
    return errorResponse(error);
  }
}
