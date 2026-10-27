import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { SessionRoute } from '@/components/session-route';
import { multiplyDivideTechniques } from '@/constants/multiply-divide-techniques';

export default async function MultiplyDivideLessonPracticePage({ params }: { params: Promise<{ technique: string }> }) {
  const { technique } = await params;
  if (!multiplyDivideTechniques.some((item) => item.id === technique)) notFound();
  return <Suspense><SessionRoute technique={technique} kind="multiplyDivide" setupHref={`/multiply-divide/learn/${technique}`} /></Suspense>;
}
