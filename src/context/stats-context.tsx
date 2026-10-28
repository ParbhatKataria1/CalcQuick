'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AnswerRecord, AppStats, SessionRecord } from '@/types';
import { applySession, defaultStats, removeSession } from '@/lib/stats';
import { useAuth } from '@/context/auth-context';

/** Where progress lived before accounts; imported into the account once, then removed. */
const LEGACY_STORAGE_KEY = 'banking-calculation-trainer-v1';

type StatsContextValue = {
  stats: AppStats;
  hydrated: boolean;
  /** Set when a change couldn't be saved to the account. */
  syncError: string | null;
  recordSession: (session: SessionRecord, answers: AnswerRecord[], durationSeconds?: number) => void;
  deleteSession: (sessionId: string) => void;
  toggleSound: () => void;
  resetProgress: () => Promise<void>;
};

const StatsContext = createContext<StatsContextValue | null>(null);

async function send(method: string, path: string, body?: unknown): Promise<AppStats> {
  // keepalive lets the last save of a session finish even if the tab is closed right after.
  const response = await fetch(path, { method, keepalive: true, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? `Saving failed (${response.status}).`);
  return data.stats;
}

function readLegacyStats(): AppStats | null {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    return raw ? { ...defaultStats, ...JSON.parse(raw) } : null;
  } catch {
    return null;
  }
}

/**
 * Progress lives in the signed-in account. Each change is applied here straight away and sent to
 * the server as an event (not the whole object), so two devices can't overwrite each other.
 */
export function StatsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [stats, setStats] = useState<AppStats>(defaultStats);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      let next = await send('GET', '/api/stats');
      const legacy = readLegacyStats();
      if (legacy && legacy.sessions.length && !next.sessions.length) next = await send('POST', '/api/stats/import', { stats: legacy });
      if (legacy) localStorage.removeItem(LEGACY_STORAGE_KEY);
      return next;
    })().then(
      (next) => {
        if (cancelled) return;
        setStats(next);
        setLoadedFor(user.id);
      },
      (error: unknown) => {
        if (cancelled) return;
        setSyncError(error instanceof Error ? error.message : String(error));
        setLoadedFor(user.id);
      },
    );
    return () => { cancelled = true; };
  }, [user]);

  const save = useCallback((request: Promise<AppStats>) =>
    request.then(() => setSyncError(null), (error: unknown) => setSyncError(error instanceof Error ? error.message : String(error))), []);

  const recordSession = useCallback((session: SessionRecord, answers: AnswerRecord[], durationSeconds?: number) => {
    const timezoneOffsetMinutes = new Date().getTimezoneOffset();
    setStats((previous) => applySession(previous, session, answers, durationSeconds, timezoneOffsetMinutes));
    save(send('POST', '/api/stats/sessions', { session, answers, durationSeconds, timezoneOffsetMinutes }));
  }, [save]);

  const deleteSession = useCallback((sessionId: string) => {
    setStats((previous) => removeSession(previous, sessionId));
    save(send('DELETE', `/api/stats/sessions/${encodeURIComponent(sessionId)}`));
  }, [save]);

  const toggleSound = useCallback(() => {
    const soundEnabled = !stats.soundEnabled;
    setStats((previous) => ({ ...previous, soundEnabled }));
    save(send('PATCH', '/api/stats', { soundEnabled }));
  }, [save, stats.soundEnabled]);

  const resetProgress = useCallback(() => {
    setStats((previous) => ({ ...defaultStats, soundEnabled: previous.soundEnabled }));
    return save(send('DELETE', '/api/stats'));
  }, [save]);

  const hydrated = Boolean(user) && loadedFor === user?.id;
  const value = useMemo(
    () => ({ stats: hydrated ? stats : defaultStats, hydrated, syncError, recordSession, deleteSession, toggleSound, resetProgress }),
    [stats, hydrated, syncError, recordSession, deleteSession, toggleSound, resetProgress],
  );

  return <StatsContext.Provider value={value}>{children}</StatsContext.Provider>;
}

export function useStats() {
  const context = useContext(StatsContext);
  if (!context) throw new Error('useStats must be used inside StatsProvider');
  return context;
}
