import { requireUser } from '@/lib/server/auth';
import { extractSets, writeVariants } from '@/lib/gemini';
import { HttpError, route } from '@/lib/server/http';
import { listSources, saveSource } from '@/lib/server/store';
import { uid } from '@/lib/mock-generator';

// Reading a full paper and rewriting its reasoning and English sets can take a few minutes.
export const maxDuration = 300;

// Vercel functions accept request bodies up to 4.5 MB.
const MAX_PDF_BYTES = 4 * 1024 * 1024;

export const GET = route(async () => {
  const user = await requireUser();
  return Response.json({ sources: await listSources(user.id) });
});

/** Reads an uploaded PDF with Gemini and saves it as a paper: Quant templates plus rewritten versions of everything else. */
export const POST = route(async (request: Request) => {
  const user = await requireUser();
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) throw new HttpError('Attach a PDF file.');
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) throw new HttpError('Only PDF files are supported.', 415);
  if (file.size > MAX_PDF_BYTES) throw new HttpError('The PDF is larger than 4 MB. Compress it or split it into parts.', 413);

  const { title, sets } = await extractSets(Buffer.from(await file.arrayBuffer()));
  // The questions are already read, so a failed rewrite only costs fresh versions; they can be generated again later.
  let warning: string | undefined;
  const variants = await writeVariants(sets.filter((set) => !set.templates)).catch((error: unknown) => {
    warning = `Questions were read, but new versions couldn't be written yet (${error instanceof Error ? error.message : 'unknown error'}). Use "Generate more with AI".`;
    return {} as Record<string, never>;
  });
  for (const set of sets) set.variants = variants[set.id] ?? [];

  const source = await saveSource(user.id, { id: uid('src'), name: title || file.name.replace(/\.pdf$/i, ''), fileName: file.name, createdAt: Date.now(), sets });
  return Response.json({ id: source.id, warning }, { status: 201 });
});
