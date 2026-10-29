import 'server-only';

/**
 * An error whose message is safe to show the user, with the HTTP status to send. `retryAfter` (seconds)
 * marks a passing condition the browser should wait out and retry by itself, such as a step still running.
 */
export class HttpError extends Error {
  constructor(message: string, public status = 400, public retryAfter?: number) {
    super(message);
  }
}

export function errorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return Response.json(
      { error: error.message, retryAfter: error.retryAfter },
      { status: error.status, headers: error.retryAfter ? { 'Retry-After': String(error.retryAfter) } : undefined },
    );
  }
  console.error(error);
  // Vercel Blob errors explain setup problems (missing credentials, suspended store), so pass them on.
  if (error instanceof Error && error.message.startsWith('Vercel Blob:')) return Response.json({ error: `File storage error: ${error.message}` }, { status: 502 });
  return Response.json({ error: 'Something went wrong on the server.' }, { status: 500 });
}

/** Wraps a route handler so thrown HttpErrors become JSON error responses. */
export function route<A extends unknown[]>(handler: (...args: A) => Promise<Response>) {
  return async (...args: A) => {
    try {
      return await handler(...args);
    } catch (error) {
      return errorResponse(error);
    }
  };
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new HttpError('Expected a JSON body.', 400);
  }
}
