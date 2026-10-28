import { SessionResult } from '@/components/session-result';

export default async function DailyChallengeResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SessionResult sessionId={id} setupHref="/daily-challenge" sessionHref="/daily-challenge/session" />;
}
