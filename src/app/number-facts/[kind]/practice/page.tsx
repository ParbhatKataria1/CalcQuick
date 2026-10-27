import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { SessionRoute } from '@/components/session-route';
import { numberFactConfig, type NumberFactKind } from '@/lib/number-fact-generator';

export default async function NumberFactPracticePage({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (!(kind in numberFactConfig)) notFound();
  return <Suspense><SessionRoute kind="numberFacts" fact={kind as NumberFactKind} setupHref={`/number-facts/${kind}`} /></Suspense>;
}
