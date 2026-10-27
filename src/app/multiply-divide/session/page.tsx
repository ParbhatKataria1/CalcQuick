import { Suspense } from 'react';
import { SessionRoute } from '@/components/session-route';

export default function MultiplyDivideSessionPage() {
  return <Suspense><SessionRoute kind="multiplyDivide" setupHref="/multiply-divide" /></Suspense>;
}
