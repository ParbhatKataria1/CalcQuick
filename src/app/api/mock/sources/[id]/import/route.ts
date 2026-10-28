import { requireUser } from '@/lib/server/auth';
import { route } from '@/lib/server/http';
import { runImportStep } from '@/lib/server/paper-import';

// One step is one Gemini call (plus uploading the PDF to Gemini the first time a key is used).
export const maxDuration = 300;

/** Reads the next part of a paper. The browser calls this until the status is "ready". */
export const POST = route(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  return Response.json(await runImportStep(user.id, (await params).id));
});
