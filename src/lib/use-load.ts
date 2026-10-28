'use client';

import { useCallback, useEffect, useState } from 'react';

/** Loads data on mount and on demand, keeping the last result while reloading. */
export function useLoad<T>(load: () => Promise<T>, key: string) {
  const [state, setState] = useState<{ data: T | null; error: string | null; loading: boolean }>({ data: null, error: null, loading: true });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    load().then(
      (data) => { if (!cancelled) setState({ data, error: null, loading: false }); },
      (error: unknown) => { if (!cancelled) setState((previous) => ({ ...previous, error: error instanceof Error ? error.message : String(error), loading: false })); },
    );
    return () => { cancelled = true; };
    // `key` stands in for `load`, which is usually an inline function.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, version]);

  const reload = useCallback(() => setVersion((value) => value + 1), []);
  return { ...state, reload };
}
