import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { SessionRoute } from '@/components/session-route';
import { bankingTechniques } from '@/constants/banking-techniques';

export default async function BankingTechniquePracticePage({ params }: { params: Promise<{ technique: string }> }) {
  const { technique } = await params;
  if (!bankingTechniques.some((item) => item.id === technique)) notFound();
  return <Suspense><SessionRoute technique={technique} kind="banking" setupHref={`/banking-method/${technique}`} /></Suspense>;
}
