import { notFound } from 'next/navigation';
import { SessionResult } from '@/components/session-result';
import { multiplyDivideTechniques } from '@/constants/multiply-divide-techniques';

export default async function MultiplyDivideLessonResultPage({ params }: { params: Promise<{ technique: string; id: string }> }) {
  const { technique, id } = await params;
  if (!multiplyDivideTechniques.some((item) => item.id === technique)) notFound();
  return <SessionResult sessionId={id} setupHref={`/multiply-divide/learn/${technique}`} sessionHref={`/multiply-divide/learn/${technique}/practice`} />;
}
