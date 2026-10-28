import { requireUser } from '@/lib/server/auth';
import { HttpError, readJson, route } from '@/lib/server/http';
import { keepPdf } from '@/lib/server/pdf-store';
import { MAX_PDF_BYTES, readUploadedPdf, uploadConfig } from '@/lib/server/pdf-upload';
import { listSources, saveSource } from '@/lib/server/store';
import { uid } from '@/lib/mock-generator';
import type { PdfRef } from '@/types/mock-test';

// Reading a 25 MB file from Blob takes a few seconds.
export const maxDuration = 60;

export const GET = route(async () => {
  const user = await requireUser();
  return Response.json({ sources: await listSources(user.id) });
});

/** The PDF arrives either as JSON pointing at a Vercel Blob upload, or directly as a form upload (local development, small files). */
async function receivePdf(request: Request, userId: string): Promise<{ pdf: Buffer; fileName: string; blobUrl?: string }> {
  if (request.headers.get('content-type')?.includes('application/json')) {
    const { blobUrl, fileName } = await readJson<{ blobUrl?: unknown; fileName?: unknown }>(request);
    if (typeof blobUrl !== 'string' || !blobUrl.startsWith('https://')) throw new HttpError('Upload the PDF first.');
    return { pdf: await readUploadedPdf(userId, blobUrl), fileName: typeof fileName === 'string' && fileName ? fileName.slice(0, 200) : 'paper.pdf', blobUrl };
  }
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) throw new HttpError('Attach a PDF file.');
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) throw new HttpError('Only PDF files are supported.', 415);
  const limit = uploadConfig().directMaxBytes;
  if (file.size > limit) throw new HttpError(`The PDF is larger than ${limit / 1024 / 1024} MB.`, 413);
  return { pdf: Buffer.from(await file.arrayBuffer()), fileName: file.name };
}

/**
 * Saves an uploaded PDF as a paper that still has to be read. Reading happens in steps from the paper
 * page (POST …/import), so a big paper never has to fit in one request or one Gemini answer.
 */
export const POST = route(async (request: Request) => {
  const user = await requireUser();
  const { pdf, fileName, blobUrl } = await receivePdf(request, user.id);
  if (pdf.length > MAX_PDF_BYTES) throw new HttpError('The PDF is larger than 25 MB.', 413);
  // Every PDF file starts with this signature.
  if (pdf.subarray(0, 5).toString('latin1') !== '%PDF-') throw new HttpError('This file is not a valid PDF.', 415);

  const stored: PdfRef = await keepPdf(blobUrl ? { blobUrl } : { bytes: pdf });
  const source = await saveSource(user.id, {
    id: uid('src'),
    name: fileName.replace(/\.pdf$/i, ''),
    fileName,
    createdAt: Date.now(),
    sets: [],
    importState: { status: 'reading', pdf: stored, chunks: [], geminiFiles: {} },
  });
  return Response.json({ id: source.id }, { status: 201 });
});
