import { Suspense } from 'react';
import { SessionRoute } from '@/components/session-route';

export default function PracticeSessionPage() {
  return <Suspense><SessionRoute kind="practice" setupHref="/practice" /></Suspense>;
}
