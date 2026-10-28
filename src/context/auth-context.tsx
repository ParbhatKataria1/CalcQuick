'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export type AuthUser = { id: string; email: string; name: string; createdAt: number };

type AuthContextValue = {
  user: AuthUser | null;
  /** False until the first check of the session has finished. */
  ready: boolean;
  logIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Pages anyone can open; everything else needs an account. Keep in sync with src/proxy.ts. */
export const PUBLIC_PATHS = ['/', '/login', '/signup'];

async function postAuth(path: string, body?: unknown): Promise<AuthUser | null> {
  const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? `Request failed (${response.status}).`);
  return data.user ?? null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  // An explicit log out goes to a plain /login, not back to the page the user was on.
  const loggingOutRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me')
      .then((response) => (response.ok ? response.json() : { user: null }))
      .catch(() => ({ user: null }))
      .then((data: { user: AuthUser | null }) => {
        if (cancelled) return;
        setUser(data.user);
        setReady(true);
      });
    return () => { cancelled = true; };
  }, []);

  // The proxy only sees that a cookie exists; an expired session is caught here.
  useEffect(() => {
    if (ready && !user && !loggingOutRef.current && !PUBLIC_PATHS.includes(pathname)) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [pathname, ready, router, user]);

  const logIn = useCallback(async (email: string, password: string) => {
    setUser(await postAuth('/api/auth/login', { email, password }));
    loggingOutRef.current = false;
  }, []);
  const signUp = useCallback(async (name: string, email: string, password: string) => {
    setUser(await postAuth('/api/auth/signup', { name, email, password }));
    loggingOutRef.current = false;
  }, []);
  const logOut = useCallback(async () => {
    loggingOutRef.current = true;
    await postAuth('/api/auth/logout').catch(() => null);
    setUser(null);
    router.replace('/login');
  }, [router]);

  const value = useMemo(() => ({ user, ready, logIn, signUp, logOut }), [user, ready, logIn, signUp, logOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
