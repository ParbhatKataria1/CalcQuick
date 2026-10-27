import { Suspense } from 'react';
import { SessionRoute } from '@/components/session-route';

export default function MistakesSessionPage() {
  return <Suspense><SessionRoute kind="mistakes" setupHref="/mistakes" /></Suspense>;
}
