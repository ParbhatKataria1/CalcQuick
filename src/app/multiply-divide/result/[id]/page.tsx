import { SessionResult } from '@/components/session-result';

export default async function MultiplyDivideResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SessionResult sessionId={id} setupHref="/multiply-divide" sessionHref="/multiply-divide/session" />;
}
