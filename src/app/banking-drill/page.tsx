'use client';

import { useState } from 'react';
import { Landmark, Play } from 'lucide-react';
import { SessionEngine } from '@/components/session-engine';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Difficulty, SessionConfig } from '@/types';
import { cn } from '@/lib/utils';

export default function BankingDrillPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [count, setCount] = useState(20);
  const [config, setConfig] = useState<SessionConfig | null>(null);
  if (config) return <SessionEngine config={config} onExit={() => setConfig(null)} />;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="rounded-3xl bg-slate-950 p-7 text-white md:p-10">
        <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-300"><Landmark className="size-6" /></div>
        <h1 className="text-3xl font-bold tracking-tight">Banking Exam Calculation Drill</h1>
        <p className="mt-3 max-w-2xl leading-7 text-slate-300">Train the raw calculations behind simplification, DI, percentages, ratios, averages, profit & loss, and interest—without turning them into full word problems yet.</p>
      </div>
      <Card className="grid gap-6 p-5 md:grid-cols-2 md:p-7">
        <div><div className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Difficulty</div><div className="mt-3 grid grid-cols-3 gap-2">{(['easy','medium','hard'] as Difficulty[]).map((item) => <button key={item} onClick={() => setDifficulty(item)} className={cn('rounded-xl border px-3 py-3 text-sm font-semibold capitalize', difficulty === item ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300')}>{item}</button>)}</div></div>
        <div><div className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Questions</div><div className="mt-3 grid grid-cols-3 gap-2">{[10,20,30].map((item) => <button key={item} onClick={() => setCount(item)} className={cn('rounded-xl border px-3 py-3 text-sm font-semibold', count === item ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300')}>{item}</button>)}</div></div>
        <Button size="lg" className="md:col-span-2" onClick={() => setConfig({ category: 'banking', difficulty, questionCount: count, mode: 'banking' })}><Play className="size-4 fill-current" /> Start Banking Drill</Button>
      </Card>
    </div>
  );
}
