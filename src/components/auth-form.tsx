'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, Calculator, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/context/auth-context';

/** Only same-site paths, so a crafted link can't send people elsewhere after logging in. */
const safeNext = (value: string | null) => (value && value.startsWith('/') && !value.startsWith('//') ? value : '/dashboard');

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter();
  const next = safeNext(useSearchParams().get('next'));
  const { user, ready, logIn, signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSignup = mode === 'signup';

  useEffect(() => {
    if (ready && user) router.replace(next);
  }, [next, ready, router, user]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (isSignup) await signUp(name, email, password);
      else await logIn(email, password);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
      setBusy(false);
    }
  };

  const otherHref = `${isSignup ? '/login' : '/signup'}${next !== '/dashboard' ? `?next=${encodeURIComponent(next)}` : ''}`;
  const inputClass = 'mt-1.5 block h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-900/60';

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 dark:bg-slate-950">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-6 flex items-center justify-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm"><Calculator className="size-5" /></div>
          <div className="text-lg font-bold tracking-tight text-slate-950 dark:text-slate-50">CalcSprint</div>
        </Link>
        <Card className="p-6">
          <h1 className="text-xl font-bold text-slate-950 dark:text-slate-50">{isSignup ? 'Create your account' : 'Log in'}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{isSignup ? 'Your practice progress and mock tests are saved to your account.' : 'Welcome back. Pick up where you left off.'}</p>
          <form onSubmit={submit} className="mt-5 space-y-4">
            {isSignup && (
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Name
                <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={60} autoComplete="name" className={inputClass} />
              </label>
            )}
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Email
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" className={inputClass} />
            </label>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Password
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} autoComplete={isSignup ? 'new-password' : 'current-password'} className={inputClass} />
              {isSignup && <span className="mt-1 block text-xs font-normal text-slate-500">At least 8 characters.</span>}
            </label>
            {error && <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"><AlertTriangle className="mt-0.5 size-4 shrink-0" /> {error}</div>}
            <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy && <Loader2 className="size-4 animate-spin" />} {isSignup ? 'Create account' : 'Log in'}</Button>
          </form>
        </Card>
        <p className="mt-5 text-center text-sm text-slate-500 dark:text-slate-400">
          {isSignup ? 'Already have an account?' : 'New to CalcSprint?'} <Link href={otherHref} className="font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">{isSignup ? 'Log in' : 'Create an account'}</Link>
        </p>
      </div>
    </div>
  );
}
