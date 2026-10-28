'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock3, Gauge, Play } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SPEED_DURATIONS, specToQuery } from '@/lib/session-url';
import type { Difficulty } from '@/types';
import { cn } from '@/lib/utils';

export default function SpeedPage() {
  const router = useRouter();
  const [duration, setDuration] = useState(120);

  useEffect(() => {
    const requested = Number(new URLSearchParams(window.location.search).get('duration'));
    if (SPEED_DURATIONS.includes(requested)) setDuration(requested);
  }, []);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300"><Gauge className="size-3.5" /> Timed mode</div>
        <h1 className="text-3xl font-bold tracking-tight">Speed Challenge</h1>
        <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-300">Solve continuously until the clock hits zero. The goal is to increase correct answers per minute without sacrificing accuracy.</p>
      </div>
      <Card className="p-5 md:p-7">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Challenge duration</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          {SPEED_DURATIONS.map((seconds) => (
            <button key={seconds} onClick={() => setDuration(seconds)} className={cn('rounded-2xl border p-5 text-left transition-all', duration === seconds ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 ring-2 ring-indigo-100' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300')}>
              <Clock3 className={cn('size-5', duration === seconds ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500')} />
              <div className="mt-4 text-2xl font-bold">{seconds / 60} min</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Continuous mixed questions</div>
            </button>
          ))}
        </div>
        <h2 className="mt-7 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Starting difficulty</h2>
        <div className="mt-3 grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 dark:bg-slate-800 p-2">
          {(['easy', 'medium', 'hard'] as Difficulty[]).map((item) => <button key={item} onClick={() => setDifficulty(item)} className={cn('rounded-xl px-4 py-3 text-sm font-semibold capitalize', difficulty === item ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-slate-50 shadow-sm' : 'text-slate-500 dark:text-slate-400')}>{item}</button>)}
        </div>
        <Button size="lg" className="mt-7 w-full" onClick={() => router.push(`/speed/session?${specToQuery({ kind: 'speed', duration, difficulty })}`)}><Play className="size-4 fill-current" /> Start Speed Challenge</Button>
      </Card>
    </div>
  );
}
