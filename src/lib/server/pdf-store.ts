import 'server-only';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { del, get } from '@vercel/blob';
import { HttpError } from '@/lib/server/http';
import { kv } from '@/lib/server/kv';
import { blobAccess } from '@/lib/server/pdf-upload';
import { uid } from '@/lib/mock-generator';
import type { PdfRef } from '@/types/mock-test';

/** Long enough to finish reading a paper across several sessions. */
const KEEP_SECONDS = 3 * 24 * 60 * 60;

/**
 * Keeps an uploaded PDF while its paper is read in several requests: a Blob upload stays where it is;
 * a direct upload goes to a local file in development, or to the database on a serverless host
 * (only small files are posted directly there).
 */
export async function keepPdf(input: { blobUrl: string } | { bytes: Buffer }): Promise<PdfRef> {
  if ('blobUrl' in input) return { kind: 'blob', url: input.blobUrl };
  if (!process.env.VERCEL) {
    const file = path.join(process.cwd(), '.data', 'pdfs', `${uid('pdf')}.pdf`);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, input.bytes);
    return { kind: 'file', path: file };
  }
  const key = `pdf:${uid('pdf')}`;
  await kv.set(key, input.bytes.toString('base64'), { ttlSeconds: KEEP_SECONDS });
  return { kind: 'kv', key };
}

export async function loadPdf(ref: PdfRef): Promise<Buffer> {
  if (ref.kind === 'blob') {
    const blob = await get(ref.url, { access: blobAccess, useCache: false });
    if (!blob || blob.statusCode !== 200) throw new HttpError('The uploaded PDF is no longer available. Delete this paper and upload it again.', 410);
    return Buffer.from(await new Response(blob.stream).arrayBuffer());
  }
  if (ref.kind === 'file') {
    return readFile(ref.path).catch(() => { throw new HttpError('The uploaded PDF is no longer available. Delete this paper and upload it again.', 410); });
  }
  const data = await kv.get<string>(ref.key);
  if (!data) throw new HttpError('The uploaded PDF is no longer available. Delete this paper and upload it again.', 410);
  return Buffer.from(data, 'base64');
}

export async function dropPdf(ref: PdfRef) {
  if (ref.kind === 'blob') await del(ref.url).catch(() => undefined);
  else if (ref.kind === 'file') await rm(ref.path, { force: true });
  else await kv.del(ref.key);
}
