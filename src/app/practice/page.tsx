'use client';

import { useEffect, useState } from 'react';
import { SessionSetup } from '@/components/session-setup';
import { SessionEngine } from '@/components/session-engine';
import type { SessionConfig } from '@/types';

export default function PracticePage() {
  const [weak, setWeak] = useState(false);
  const [config, setConfig] = useState<SessionConfig | null>(null);

  useEffect(() => {
    setWeak(new URLSearchParams(window.location.search).get('weak') === '1');
  }, []);

  if (config) return <SessionEngine config={config} onExit={() => setConfig(null)} />;

  if (weak) {
    return (
      <div className="space-y-5">
        <SessionSetup
          title="Weak Area Training"
          description="This mixed session automatically gives extra weight to the calculation categories where your accuracy or response time needs the most work."
          defaultCategory="mixed"
          mode="weak"
          onStart={(next) => setConfig({ ...next, category: 'mixed', mode: 'weak' })}
        />
      </div>
    );
  }

  return <SessionSetup onStart={setConfig} />;
}
