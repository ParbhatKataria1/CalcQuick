import { Suspense } from 'react';
import { SessionRoute } from '@/components/session-route';

export default function FractionsPracticePage() {
  return <Suspense><SessionRoute kind="fractions" setupHref="/number-facts/fractions" /></Suspense>;
}
