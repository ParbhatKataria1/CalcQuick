import 'server-only';
import { del, get, type BlobAccessType } from '@vercel/blob';
import { HttpError } from '@/lib/server/http';

/** Largest PDF a user can upload; large papers are read through the Gemini Files API, in parts. */
export const MAX_PDF_BYTES = 25 * 1024 * 1024;
/** Vercel functions accept request bodies up to 4.5 MB, so larger PDFs go through Vercel Blob. */
const VERCEL_BODY_LIMIT_BYTES = 4 * 1024 * 1024;

/**
 * Older Blob stores give the project a read-write token; newer ones give a store id and the
 * deployment signs in with Vercel's OIDC token, which only supports presigned uploads.
 */
export const blobMode: 'token' | 'presigned' | null = process.env.BLOB_READ_WRITE_TOKEN ? 'token' : process.env.BLOB_STORE_ID ? 'presigned' : null;
export const blobEnabled = blobMode !== null;
/** Must match the store's access setting; stores created as Private keep uploaded papers off the public internet. */
export const blobAccess: BlobAccessType = process.env.BLOB_ACCESS === 'public' ? 'public' : 'private';

/** Each user uploads into their own folder, so nobody can make the server read someone else's file. */
export const uploadFolder = (userId: string) => `mock-pdfs/${userId}/`;

/** What the browser needs to choose an upload path. */
export const uploadConfig = () => ({
  blob: blobEnabled,
  mode: blobMode,
  access: blobAccess,
  maxBytes: MAX_PDF_BYTES,
  // Without Blob, PDFs are sent straight to the function, which on Vercel caps the size.
  directMaxBytes: process.env.VERCEL ? VERCEL_BODY_LIMIT_BYTES : MAX_PDF_BYTES,
});

/** Reads a PDF the browser uploaded to Blob after checking it belongs to this user. The file stays until the paper is read. */
export async function readUploadedPdf(userId: string, url: string): Promise<Buffer> {
  if (!blobEnabled) throw new HttpError('File storage is not connected.', 503);
  const blob = await get(url, { access: blobAccess, useCache: false });
  if (!blob || blob.statusCode !== 200) throw new HttpError('The uploaded file was not found. Upload it again.', 404);
  if (!blob.blob.pathname.startsWith(uploadFolder(userId))) throw new HttpError('This file belongs to another account.', 403);
  const data = Buffer.from(await new Response(blob.stream).arrayBuffer());
  if (data.length > MAX_PDF_BYTES) {
    await del(url).catch(() => undefined);
    throw new HttpError('The PDF is larger than 25 MB.', 413);
  }
  return data;
}
