import { requireUser } from '@/lib/server/auth';
import { extractSets, writeVariants } from '@/lib/gemini';
import { HttpError, readJson, route } from '@/lib/server/http';
import { MAX_PDF_BYTES, takeUploadedPdf, uploadConfig } from '@/lib/server/pdf-upload';
import { listSources, saveSource } from '@/lib/server/store';
import { uid } from '@/lib/mock-generator';

// Reading a full paper and rewriting its reasoning and English sets can take a few minutes.
export const maxDuration = 300;

export const GET = route(async () => {
  const user = await requireUser();
  return Response.json({ sources: await listSources(user.id) });
});

/** The PDF arrives either as JSON pointing at a Vercel Blob upload, or directly as a form upload (local development, small files). */
async function receivePdf(request: Request, userId: string): Promise<{ pdf: Buffer; fileName: string }> {
  if (request.headers.get('content-type')?.includes('application/json')) {
    const { blobUrl, fileName } = await readJson<{ blobUrl?: unknown; fileName?: unknown }>(request);
    if (typeof blobUrl !== 'string' || !blobUrl.startsWith('https://')) throw new HttpError('Upload the PDF first.');
    return { pdf: await takeUploadedPdf(userId, blobUrl), fileName: typeof fileName === 'string' && fileName ? fileName.slice(0, 200) : 'paper.pdf' };
  }
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) throw new HttpError('Attach a PDF file.');
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) throw new HttpError('Only PDF files are supported.', 415);
  const limit = uploadConfig().directMaxBytes;
  if (file.size > limit) throw new HttpError(`The PDF is larger than ${limit / 1024 / 1024} MB.`, 413);
  return { pdf: Buffer.from(await file.arrayBuffer()), fileName: file.name };
}

/** Reads an uploaded PDF with Gemini and saves it as a paper: Quant templates plus rewritten versions of everything else. */
export const POST = route(async (request: Request) => {
  const user = await requireUser();
  const { pdf, fileName } = await receivePdf(request, user.id);
  if (pdf.length > MAX_PDF_BYTES) throw new HttpError('The PDF is larger than 8 MB.', 413);
  // Every PDF file starts with this signature.
  if (pdf.subarray(0, 5).toString('latin1') !== '%PDF-') throw new HttpError('This file is not a valid PDF.', 415);

  const { title, sets } = await extractSets(pdf);
  // The questions are already read, so a failed rewrite only costs fresh versions; they can be generated again later.
  let warning: string | undefined;
  const variants = await writeVariants(sets.filter((set) => !set.templates)).catch((error: unknown) => {
    warning = `Questions were read, but new versions couldn't be written yet (${error instanceof Error ? error.message : 'unknown error'}). Use "Generate more with AI".`;
    return {} as Record<string, never>;
  });
  for (const set of sets) set.variants = variants[set.id] ?? [];

  const source = await saveSource(user.id, { id: uid('src'), name: title || fileName.replace(/\.pdf$/i, ''), fileName, createdAt: Date.now(), sets });
  return Response.json({ id: source.id, warning }, { status: 201 });
});
