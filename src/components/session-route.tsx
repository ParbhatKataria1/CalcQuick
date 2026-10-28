'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SessionEngine } from '@/components/session-engine';
import { useStats } from '@/context/stats-context';
import { buildRetrySession, buildSession, specFromQuery, type SessionKind, type SessionRouteParams } from '@/lib/session-url';

type Props = {
  kind: SessionKind;
  /** The setup screen; results live under `${setupHref}/result/[id]`. */
  setupHref: string;
} & SessionRouteParams;

/** Starts a session from the settings in the URL, so a session can be reloaded, bookmarked or shared. */
export function SessionRoute(props: Props) {
  const params = useSearchParams();
  const { hydrated } = useStats();
  // Reviews and missed facts come from saved stats, so wait until they are loaded.
  if (!hydrated) return null;
  return <SessionLoader key={params.toString()} query={params.toString()} {...props} />;
}

function SessionLoader({ kind, setupHref, fact, technique, query }: Props & { query: string }) {
  const { stats } = useStats();
  const [session] = useState(() => {
    const params = new URLSearchParams(query);
    const spec = specFromQuery(kind, params, { fact, technique });
    const retry = params.get('retry');
    const built = retry ? buildRetrySession(retry, stats, kind === 'numberFacts' || kind === 'fractions') : buildSession(spec, stats);
    return { built, exitHref: spec.kind === 'practice' && spec.weak ? `${setupHref}?weak=1` : setupHref };
  });

  if (!session.built) {
    return (
      <Card className="mx-auto max-w-xl p-10 text-center">
        <SearchX className="mx-auto size-9 text-slate-300" />
        <h1 className="mt-4 text-xl font-bold">Nothing to practise</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">There are no questions for this session yet.</p>
        <Link href={setupHref} className="mt-6 inline-block"><Button variant="outline"><ArrowLeft className="size-4" /> Back to setup</Button></Link>
      </Card>
    );
  }

  const { config, initialQuestions, repeatMistakes, reviewDue } = session.built;
  return (
    <SessionEngine
      config={config}
      initialQuestions={initialQuestions}
      repeatMistakes={repeatMistakes}
      reviewDue={reviewDue}
      exitHref={session.exitHref}
      resultHref={(id) => `${setupHref}/result/${encodeURIComponent(id)}`}
    />
  );
}
