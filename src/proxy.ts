import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/session-cookie';

/** Pages anyone can open; keep in sync with PUBLIC_PATHS in src/context/auth-context.tsx. */
const PUBLIC_PATHS = new Set(['/', '/login', '/signup']);

/**
 * Sends visitors without a session cookie to the login page. This is only a quick first check:
 * API routes verify the session itself, and the app re-checks it when it loads.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (PUBLIC_PATHS.has(pathname) || request.cookies.has(SESSION_COOKIE)) return NextResponse.next();
  const login = new URL('/login', request.url);
  login.searchParams.set('next', `${pathname}${search}`);
  return NextResponse.redirect(login);
}

export const config = {
  // Everything except API routes, Next.js internals and files with an extension (icons, robots.txt, sitemap.xml).
  matcher: ['/((?!api/|_next/|.*\\..*).*)'],
};
