import { issueSignedToken } from '@vercel/blob';
import { handleUpload, handleUploadPresigned, type HandleUploadBody, type HandleUploadPresignedBody } from '@vercel/blob/client';
import { requireUser } from '@/lib/server/auth';
import { HttpError, readJson, route } from '@/lib/server/http';
import { MAX_PDF_BYTES, blobEnabled, uploadConfig, uploadFolder } from '@/lib/server/pdf-upload';

/** How long the browser has to start its upload. */
const UPLOAD_WINDOW_MS = 10 * 60 * 1000;

export const GET = route(async () => {
  await requireUser();
  return Response.json(uploadConfig());
});

/** Lets the browser upload one PDF straight to Vercel Blob, only into the signed-in user's folder. */
export const POST = route(async (request: Request) => {
  const user = await requireUser();
  if (!blobEnabled) throw new HttpError('File storage is not connected.', 503);
  const body = await readJson<HandleUploadBody | HandleUploadPresignedBody>(request);
  const checkPath = (pathname: string) => {
    if (!pathname.startsWith(uploadFolder(user.id))) throw new HttpError('Invalid upload path.', 403);
  };

  // Stores connected with a read-write token: the browser gets a client token.
  if (body.type === 'blob.generate-client-token') {
    return Response.json(await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname) => {
        checkPath(pathname);
        return { allowedContentTypes: ['application/pdf'], maximumSizeInBytes: MAX_PDF_BYTES, addRandomSuffix: true };
      },
    }));
  }

  // Stores connected through OIDC (BLOB_STORE_ID): the browser gets a presigned URL for exactly this path.
  if (body.type === 'blob.generate-presigned-url') {
    return Response.json(await handleUploadPresigned({
      request,
      body,
      getSignedToken: async (pathname) => {
        checkPath(pathname);
        const validUntil = Date.now() + UPLOAD_WINDOW_MS;
        const constraints = { allowedContentTypes: ['application/pdf'], maximumSizeInBytes: MAX_PDF_BYTES, validUntil };
        return { token: await issueSignedToken({ pathname, operations: ['put'], ...constraints }), urlOptions: constraints };
      },
    }));
  }

  throw new HttpError('Unsupported upload event.');
});
