'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SessionEngine } from '@/components/session-engine';
import { generateNumberFactSet, getNumberFactRows, numberFactConfig, type NumberFactKind } from '@/lib/number-fact-generator';
import type { Question, SessionConfig } from '@/types';
import { cn } from '@/lib/utils';

export function NumberFactPage({ kind }: { kind: NumberFactKind }) {
  const config = numberFactConfig[kind];
  const [from, setFrom] = useState(config.min);
  const [to, setTo] = useState(config.max);
  const [count, setCount] = useState(20);
  const [session, setSession] = useState<{ config: SessionConfig; questions: Question[] } | null>(null);
  if (session) return <SessionEngine config={session.config} initialQuestions={session.questions} onExit={() => setSession(null)} />;
  const values = Array.from({ length: config.max - config.min + 1 }, (_, index) => config.min + index);
  const start = () => setSession({ config: { category: config.category, difficulty: 'medium', questionCount: count, mode: 'practice' }, questions: generateNumberFactSet(kind, from, to, count) });

  return <div className="mx-auto max-w-6xl space-y-6"><Link href="/number-facts" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600"><ArrowLeft className="size-4" /> Number facts</Link>
    <div className="rounded-3xl bg-slate-950 p-7 text-white md:p-10"><BookOpen className="size-8 text-indigo-300" /><h1 className="mt-5 text-3xl font-bold">{config.title}</h1><p className="mt-3 max-w-2xl leading-7 text-slate-300">{config.description}</p></div>
    <Card className="p-5 md:p-7"><h2 className="text-xl font-bold">Choose your practice range</h2><p className="mt-1 text-sm text-slate-500">Every selected number is included when the session contains enough questions.</p><div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"><RangeSelect label={kind === 'tables' ? 'From table' : 'From number'} value={from} values={values.filter((value) => value <= to)} onChange={setFrom} /><RangeSelect label={kind === 'tables' ? 'To table' : 'To number'} value={to} values={values.filter((value) => value >= from)} onChange={setTo} /><div><div className="text-xs font-bold uppercase tracking-wider text-slate-500">Questions</div><div className="mt-2 grid grid-cols-3 gap-2">{[10,20,30].map((value) => <button key={value} onClick={() => setCount(value)} className={cn('rounded-xl border p-3 text-sm font-semibold', count === value ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 dark:border-slate-800')}>{value}</button>)}</div></div><div className="flex items-end"><Button size="lg" className="w-full" onClick={start}><Play className="size-4 fill-current" /> Practice {from}–{to}</Button></div></div></Card>
    <section><div className="mb-4"><h2 className="text-xl font-bold">Complete reference chart</h2><p className="mt-1 text-sm text-slate-500">Read aloud, cover the answers, then test retrieval.</p></div>{kind === 'tables' ? <TablesGrid /> : <PowerGrid kind={kind} />}</section>
  </div>;
}

function RangeSelect({ label, value, values, onChange }: { label: string; value: number; values: number[]; onChange: (value: number) => void }) { return <label><span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span><select value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 font-bold dark:border-slate-800 dark:bg-slate-900">{values.map((item) => <option key={item}>{item}</option>)}</select></label>; }
function PowerGrid({ kind }: { kind: 'squares' | 'cubes' }) { return <div className="grid gap-2 grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8">{getNumberFactRows(kind).map(({ value, result }) => <Card key={value} className="p-4 text-center"><div className="text-sm text-slate-400">{value}{kind === 'squares' ? '²' : '³'}</div><div className="mt-1 text-lg font-bold">{result}</div></Card>)}</div>; }
function TablesGrid() { return <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">{getNumberFactRows('tables').map(({ value }) => <Card key={value} className="overflow-hidden"><div className="bg-indigo-50 px-4 py-3 font-bold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">Table of {value}</div><div className="flex flex-col gap-1.5 p-4 text-sm">{Array.from({ length: 10 }, (_, index) => index + 1).map((multiplier) => <div key={multiplier} className="flex justify-between"><span className="text-slate-500">{value} × {multiplier}</span><span className="font-bold">{value * multiplier}</span></div>)}</div></Card>)}</div>; }
