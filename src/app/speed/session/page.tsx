import { Suspense } from 'react';
import { SessionRoute } from '@/components/session-route';

export default function SpeedSessionPage() {
  return <Suspense><SessionRoute kind="speed" setupHref="/speed" /></Suspense>;
}
