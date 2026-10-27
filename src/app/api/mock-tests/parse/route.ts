import { MockApiError, errorResponse, extractSets, writeVariants } from '@/lib/gemini';

// Reading a full paper and rewriting its reasoning and English sets can take a few minutes.
export const maxDuration = 300;

const MAX_PDF_BYTES = 15 * 1024 * 1024;

/** Turns an uploaded PDF into question sets: Quant templates plus rewritten versions of everything else. */
export async function POST(request: Request) {
  try {
    const form = await request.formData().catch(() => null);
    const file = form?.get('file');
    if (!(file instanceof File)) throw new MockApiError('Attach a PDF file.', 400);
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) throw new MockApiError('Only PDF files are supported.', 415);
    if (file.size > MAX_PDF_BYTES) throw new MockApiError('The PDF is larger than 15 MB.', 413);

    const { title, sets } = await extractSets(Buffer.from(await file.arrayBuffer()));
    // The questions are already read, so a failed rewrite only costs fresh versions; they can be generated again later.
    let warning: string | undefined;
    const variants = await writeVariants(sets.filter((set) => !set.templates)).catch((error: unknown) => {
      warning = `Questions were read, but new versions couldn't be written yet (${error instanceof Error ? error.message : 'unknown error'}). Use "Generate more with AI" on the test page.`;
      return {} as Record<string, never>;
    });
    for (const set of sets) set.variants = variants[set.id] ?? [];

    return Response.json({ title: title || file.name.replace(/\.pdf$/i, ''), sets, warning });
  } catch (error) {
    return errorResponse(error);
  }
}

