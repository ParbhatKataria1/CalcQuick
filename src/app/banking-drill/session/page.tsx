import { Suspense } from 'react';
import { SessionRoute } from '@/components/session-route';

export default function BankingDrillSessionPage() {
  return <Suspense><SessionRoute kind="banking" setupHref="/banking-drill" /></Suspense>;
}
