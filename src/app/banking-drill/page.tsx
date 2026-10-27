'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Brain, Combine, Landmark, Layers3, Play, Route, Scale } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Difficulty } from '@/types';
import { cn } from '@/lib/utils';
import type { BankingTechnique } from '@/lib/question-generator';
import { specToQuery } from '@/lib/session-url';

const techniques: Array<{ id: BankingTechnique; title: string; description: string; example: string; icon: typeof Brain }> = [
  { id: 'complements', title: 'Master complements', description: 'Build instant recall to the next 10, 100, or 1000.', example: '37 + 63 = 100', icon: Brain },
  { id: 'compensation', title: 'Use compensation', description: 'Round near a clean boundary, then correct the difference.', example: '843 − 398 → −400 + 2', icon: Scale },
  { id: 'leftToRight', title: 'Calculate left → right', description: 'Add hundreds, tens, and units as quick mental jumps.', example: '736 + 248 → +200 +40 +8', icon: ArrowRight },
  { id: 'pairing', title: 'Pair intelligently', description: 'Scan a group for pairs that form clean totals first.', example: '67 + 33 & 38 + 62', icon: Combine },
  { id: 'chunking', title: 'Break into chunks', description: 'Split awkward numbers into convenient place-value parts.', example: '687 − 243 → −200 −40 −3', icon: Layers3 },
];

export default function BankingDrillPage() {
  const router = useRouter();
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [count, setCount] = useState(20);
  const [selected, setSelected] = useState<BankingTechnique | 'path'>('path');
  const [complementDigits, setComplementDigits] = useState<1 | 2 | 3>(3);

  const start = () => {
    const ids = selected === 'path' ? techniques.map((technique) => technique.id) : [selected];
    router.push(`/banking-drill/session?${specToQuery({ kind: 'banking', techniques: ids, difficulty, count, digits: complementDigits })}`);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="rounded-3xl bg-slate-950 p-7 text-white md:p-10">
        <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-300"><Landmark className="size-6" /></div>
        <h1 className="text-3xl font-bold tracking-tight">Banking Exam Calculation Method</h1>
        <p className="mt-3 max-w-2xl leading-7 text-slate-300">Perform fewer mental operations. Train the five highest-value techniques for simplification, approximation, and Data Interpretation—in the right order.</p>
        <Link href="/banking-method" className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10"><Brain className="size-4" /> Read theory and worked examples</Link>
      </div>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div><h2 className="text-xl font-bold">Your training path</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Choose the full path or focus on one technique.</p></div>
          <span className="hidden text-xs font-semibold uppercase tracking-wider text-indigo-600 sm:block">Learn → recognize → retrieve</span>
        </div>
        <button type="button" onClick={() => setSelected('path')} className={cn('mb-3 flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition', selected === 'path' ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100 dark:bg-indigo-950/30 dark:ring-indigo-900' : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900')}>
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white"><Route className="size-5" /></div>
          <div className="flex-1"><div className="font-bold">Complete 5-technique pathway</div><div className="mt-1 text-sm text-slate-500 dark:text-slate-400">Questions cycle through every technique in the recommended order.</div></div>
          <div className="hidden rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 sm:block">Recommended</div>
        </button>
        <div className="grid gap-3 md:grid-cols-5">
          {techniques.map((technique, index) => {
            const Icon = technique.icon;
            return (
              <button type="button" key={technique.id} onClick={() => setSelected(technique.id)} className={cn('rounded-2xl border p-4 text-left transition', selected === technique.id ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100 dark:bg-indigo-950/30 dark:ring-indigo-900' : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900')}>
                <div className="mb-4 flex items-center justify-between"><span className="flex size-9 items-center justify-center rounded-xl bg-slate-100 font-bold text-indigo-700 dark:bg-slate-800 dark:text-indigo-300">{index + 1}</span><Icon className="size-4 text-slate-400" /></div>
                <div className="font-bold leading-5">{technique.title}</div>
                <div className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{technique.description}</div>
                <div className="mt-3 rounded-lg bg-slate-100 px-2.5 py-2 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{technique.example}</div>
              </button>
            );
          })}
        </div>
      </section>

      <Card className="grid gap-6 p-5 md:grid-cols-2 md:p-7">
        {(selected === 'complements' || selected === 'path') && <div className="md:col-span-2"><div className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Complements up to</div><div className="mt-3 grid grid-cols-3 gap-2">{([1, 2, 3] as const).map((digits) => <button type="button" key={digits} onClick={() => setComplementDigits(digits)} className={cn('rounded-xl border px-3 py-3 text-sm font-semibold', complementDigits === digits ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-300')}>{digits} digit{digits > 1 ? 's' : ''} <span className="block text-[11px] font-medium opacity-75">to {10 ** digits}</span></button>)}</div><p className="mt-2 text-xs text-slate-500">Includes every complement level up to the selected number of digits.</p></div>}
        <div><div className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Difficulty</div><div className="mt-3 grid grid-cols-3 gap-2">{(['easy', 'medium', 'hard'] as Difficulty[]).map((item) => <button type="button" key={item} onClick={() => setDifficulty(item)} className={cn('rounded-xl border px-3 py-3 text-sm font-semibold capitalize', difficulty === item ? 'border-slate-950 bg-slate-950 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-950' : 'border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-300')}>{item}</button>)}</div></div>
        <div><div className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Questions</div><div className="mt-3 grid grid-cols-3 gap-2">{[10, 20, 30].map((item) => <button type="button" key={item} onClick={() => setCount(item)} className={cn('rounded-xl border px-3 py-3 text-sm font-semibold', count === item ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-300')}>{item}</button>)}</div></div>
        <Button size="lg" className="md:col-span-2" onClick={start}><Play className="size-4 fill-current" /> Start {selected === 'path' ? 'Complete Path' : techniques.find((item) => item.id === selected)?.title}</Button>
      </Card>
    </div>
  );
}
