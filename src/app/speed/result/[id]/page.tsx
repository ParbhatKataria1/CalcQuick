import { SessionResult } from '@/components/session-result';

export default async function SpeedResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SessionResult sessionId={id} setupHref="/speed" sessionHref="/speed/session" />;
}
