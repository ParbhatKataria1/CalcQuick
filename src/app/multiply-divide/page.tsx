'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Divide, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { multiplyDivideTechniques } from '@/constants/multiply-divide-techniques';
import type { MultiplyDivideTechnique } from '@/lib/question-generator';
import { specToQuery } from '@/lib/session-url';
import type { Difficulty } from '@/types';
import { cn } from '@/lib/utils';

const techniqueGroups = [...new Set(multiplyDivideTechniques.map((item) => item.group))];

export default function MultiplyDividePracticePage() {
  const router = useRouter();
  const [selected, setSelected] = useState<MultiplyDivideTechnique | 'all'>('all');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [count, setCount] = useState(20);
  const start = () => { const ids = selected === 'all' ? multiplyDivideTechniques.map((item) => item.id) : [selected]; router.push(`/multiply-divide/session?${specToQuery({ kind: 'multiplyDivide', techniques: ids, difficulty, count })}`); };
  return <div className="mx-auto max-w-6xl space-y-6"><div className="rounded-3xl bg-slate-950 p-7 text-white md:p-10"><div className="flex size-12 items-center justify-center rounded-2xl bg-violet-500/20 text-violet-300"><Divide className="size-6" /></div><h1 className="mt-5 text-3xl font-bold">Multiplication & Division Practice</h1><p className="mt-3 max-w-2xl leading-7 text-slate-300">Train patterns, decomposition, square and cube shortcuts, roots, reverse multiplication, factorization, and exam approximation.</p><Link href="/multiply-divide/learn" className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold hover:bg-white/10"><BookOpen className="size-4" /> Read theory and examples</Link></div>
  <section><h2 className="text-xl font-bold">Choose a focused drill</h2><button onClick={() => setSelected('all')} className={cn('mt-3 w-full rounded-2xl border p-4 text-left font-bold', selected === 'all' ? 'border-violet-500 bg-violet-50 text-violet-800 dark:bg-violet-950/30 dark:text-violet-200' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900')}>Complete {multiplyDivideTechniques.length}-technique pathway <span className="ml-2 text-xs font-medium opacity-70">Recommended</span></button>{techniqueGroups.map((group) => <div key={group} className="mt-5"><h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">{group}</h3><div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{multiplyDivideTechniques.filter((item) => item.group === group).map((item) => <button key={item.id} onClick={() => setSelected(item.id)} className={cn('rounded-2xl border p-4 text-left', selected === item.id ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/30' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900')}><div className="text-xs font-bold uppercase text-violet-600">{item.group} · {item.number}</div><div className="mt-2 font-bold">{item.title}</div><div className="mt-2 text-xs leading-5 text-slate-500">{item.summary}</div></button>)}</div></div>)}</section>
  <Card className="grid gap-5 p-6 md:grid-cols-2"><div><div className="text-xs font-bold uppercase text-slate-500">Difficulty</div><div className="mt-3 grid grid-cols-3 gap-2">{(['easy','medium','hard'] as Difficulty[]).map((value) => <button key={value} onClick={() => setDifficulty(value)} className={cn('rounded-xl border p-3 text-sm font-semibold capitalize', difficulty === value ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950' : 'border-slate-200 dark:border-slate-800')}>{value}</button>)}</div></div><div><div className="text-xs font-bold uppercase text-slate-500">Questions</div><div className="mt-3 grid grid-cols-3 gap-2">{[10,20,30].map((value) => <button key={value} onClick={() => setCount(value)} className={cn('rounded-xl border p-3 text-sm font-semibold', count === value ? 'bg-violet-600 text-white' : 'border-slate-200 dark:border-slate-800')}>{value}</button>)}</div></div><Button size="lg" className="md:col-span-2" onClick={start}><Play className="size-4 fill-current" /> Start practice</Button></Card></div>;
}
