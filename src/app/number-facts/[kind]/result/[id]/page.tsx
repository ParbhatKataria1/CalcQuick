import { notFound } from 'next/navigation';
import { SessionResult } from '@/components/session-result';
import { numberFactConfig } from '@/lib/number-fact-generator';

export default async function NumberFactResultPage({ params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params;
  if (!(kind in numberFactConfig)) notFound();
  return <SessionResult sessionId={id} setupHref={`/number-facts/${kind}`} sessionHref={`/number-facts/${kind}/practice`} />;
}
