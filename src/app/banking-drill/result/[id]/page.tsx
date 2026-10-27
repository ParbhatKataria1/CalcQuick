import { SessionResult } from '@/components/session-result';

export default async function BankingDrillResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SessionResult sessionId={id} setupHref="/banking-drill" sessionHref="/banking-drill/session" />;
}
