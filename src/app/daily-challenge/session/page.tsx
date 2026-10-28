import { Suspense } from 'react';
import { SessionRoute } from '@/components/session-route';

export default function DailyChallengeSessionPage() {
  return <Suspense><SessionRoute kind="daily" setupHref="/daily-challenge" /></Suspense>;
}
