import { SessionResult } from '@/components/session-result';

export default async function PracticeResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SessionResult sessionId={id} setupHref="/practice" sessionHref="/practice/session" />;
}
