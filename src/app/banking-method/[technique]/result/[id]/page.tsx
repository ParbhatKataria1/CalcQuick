import { notFound } from 'next/navigation';
import { SessionResult } from '@/components/session-result';
import { bankingTechniques } from '@/constants/banking-techniques';

export default async function BankingTechniqueResultPage({ params }: { params: Promise<{ technique: string; id: string }> }) {
  const { technique, id } = await params;
  if (!bankingTechniques.some((item) => item.id === technique)) notFound();
  return <SessionResult sessionId={id} setupHref={`/banking-method/${technique}`} sessionHref={`/banking-method/${technique}/practice`} />;
}
