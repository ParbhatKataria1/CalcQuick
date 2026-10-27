'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SessionSetup } from '@/components/session-setup';
import { specToQuery } from '@/lib/session-url';
import type { SessionConfig } from '@/types';

export default function PracticePage() {
  const router = useRouter();
  const [weak, setWeak] = useState(false);

  useEffect(() => {
    setWeak(new URLSearchParams(window.location.search).get('weak') === '1');
  }, []);

  const start = ({ category, difficulty, questionCount }: SessionConfig) =>
    router.push(`/practice/session?${specToQuery({ kind: 'practice', category, difficulty, count: questionCount, weak })}`);

  if (weak) {
    return (
      <div className="space-y-5">
        <SessionSetup
          title="Weak Area Training"
          description="This mixed session automatically gives extra weight to the calculation categories where your accuracy or response time needs the most work."
          defaultCategory="mixed"
          mode="weak"
          onStart={start}
        />
      </div>
    );
  }

  return <SessionSetup onStart={start} />;
}
