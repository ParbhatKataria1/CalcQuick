import { SessionResult } from '@/components/session-result';

export default async function MistakesResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SessionResult sessionId={id} setupHref="/mistakes" sessionHref="/mistakes/session" />;
}
