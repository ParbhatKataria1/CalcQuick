import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { requireUser } from '@/lib/server/auth';
import { HttpError, readJson, route } from '@/lib/server/http';
import { MAX_PDF_BYTES, blobEnabled, uploadConfig, uploadFolder } from '@/lib/server/pdf-upload';

export const GET = route(async () => {
  await requireUser();
  return Response.json(uploadConfig());
});

/** Issues a short-lived token so the browser can upload one PDF straight to Vercel Blob. */
export const POST = route(async (request: Request) => {
  const user = await requireUser();
  if (!blobEnabled) throw new HttpError('File storage is not connected.', 503);
  const body = await readJson<HandleUploadBody>(request);
  if (body.type !== 'blob.generate-client-token') throw new HttpError('Unsupported upload event.');
  const result = await handleUpload({
    request,
    body,
    onBeforeGenerateToken: async (pathname) => {
      if (!pathname.startsWith(uploadFolder(user.id))) throw new HttpError('Invalid upload path.', 403);
      return { allowedContentTypes: ['application/pdf'], maximumSizeInBytes: MAX_PDF_BYTES, addRandomSuffix: true };
    },
  });
  return Response.json(result);
});
