import { SessionResult } from '@/components/session-result';

export default async function FractionsResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SessionResult sessionId={id} setupHref="/number-facts/fractions" sessionHref="/number-facts/fractions/practice" />;
}
