import 'server-only';
import { del, get, type BlobAccessType } from '@vercel/blob';
import { HttpError } from '@/lib/server/http';

/** Largest PDF a user can upload. */
export const MAX_PDF_BYTES = 8 * 1024 * 1024;
/** Vercel functions accept request bodies up to 4.5 MB, so larger PDFs go through Vercel Blob. */
const VERCEL_BODY_LIMIT_BYTES = 4 * 1024 * 1024;

export const blobEnabled = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
/** Must match the store's access setting; stores created as Private keep uploaded papers off the public internet. */
export const blobAccess: BlobAccessType = process.env.BLOB_ACCESS === 'public' ? 'public' : 'private';

/** Each user uploads into their own folder, so nobody can make the server read someone else's file. */
export const uploadFolder = (userId: string) => `mock-pdfs/${userId}/`;

/** What the browser needs to choose an upload path. */
export const uploadConfig = () => ({
  blob: blobEnabled,
  access: blobAccess,
  maxBytes: MAX_PDF_BYTES,
  // Without Blob, PDFs are sent straight to the function, which on Vercel caps the size.
  directMaxBytes: process.env.VERCEL ? VERCEL_BODY_LIMIT_BYTES : MAX_PDF_BYTES,
});

/** Reads a PDF the browser uploaded to Blob, then deletes it: the paper is kept as questions, not as a file. */
export async function takeUploadedPdf(userId: string, url: string): Promise<Buffer> {
  if (!blobEnabled) throw new HttpError('File storage is not connected.', 503);
  try {
    const blob = await get(url, { access: blobAccess, useCache: false });
    if (!blob || blob.statusCode !== 200) throw new HttpError('The uploaded file was not found. Upload it again.', 404);
    if (!blob.blob.pathname.startsWith(uploadFolder(userId))) throw new HttpError('This file belongs to another account.', 403);
    const data = Buffer.from(await new Response(blob.stream).arrayBuffer());
    if (data.length > MAX_PDF_BYTES) throw new HttpError('The PDF is larger than 8 MB.', 413);
    return data;
  } finally {
    await del(url).catch(() => undefined);
  }
}
