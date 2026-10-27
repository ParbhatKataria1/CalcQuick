'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, Lightbulb, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChoiceButton } from '@/components/number-fact-page';
import { decimalPercent, fractionFacts, fractionLabel, fractionSets, mixedPercent, type FractionDirection, type FractionSetId } from '@/lib/fraction-facts';
import { specToQuery } from '@/lib/session-url';
import { cn } from '@/lib/utils';

const directions: Array<{ id: FractionDirection; title: string; detail: string }> = [
  { id: 'toPercent', title: 'Fraction → %', detail: '3/8 = ?%' },
  { id: 'toFraction', title: '% → Fraction', detail: '37.5% = ?' },
  { id: 'both', title: 'Both', detail: 'Mix of the two' },
];

const examTips = [
  { rule: 'Increase by 25% → × 5/4, decrease by 20% → × 4/5', example: '₹4,800 raised by 25% = 4,800 × 5/4 = ₹6,000' },
  { rule: 'Profit of 16.67% means CP : SP = 6 : 7', example: 'SP ₹1,400 at 16.67% profit → CP = 1,400 × 6/7 = ₹1,200' },
  { rule: 'Successive changes multiply as fractions', example: '+14.28% then −12.5% = 8/7 × 7/8 = 1, so no net change' },
  { rule: 'Percent of a number becomes one division', example: '37.5% of 640 = 3/8 × 640 = 240' },
  { rule: 'Multiples of 1/9 and 1/11 repeat the digits', example: '1/9 = 11.11% so 4/9 = 44.44%; 1/11 = 9.09% so 7/11 = 63.63%' },
  { rule: 'Ratio questions in DI hide these fractions', example: 'A share of 28.57% of the total is 2/7 of it' },
];

export function FractionFactPage() {
  const router = useRouter();
  const [sets, setSets] = useState<FractionSetId[]>(['unit', 'multiples']);
  const [direction, setDirection] = useState<FractionDirection>('both');
  const [count, setCount] = useState(20);

  const toggleSet = (id: FractionSetId) => setSets((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const start = () => router.push(`/number-facts/fractions/practice?${specToQuery({ kind: 'fractions', sets, direction, count })}`);

  return <div className="mx-auto max-w-6xl space-y-6"><Link href="/number-facts" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600"><ArrowLeft className="size-4" /> Number facts</Link>
    <div className="rounded-3xl bg-slate-950 p-7 text-white md:p-10"><BookOpen className="size-8 text-indigo-300" /><h1 className="mt-5 text-3xl font-bold">Fractions & Percentages</h1><p className="mt-3 max-w-2xl leading-7 text-slate-300">The conversion list behind percentage, profit & loss, ratio and data interpretation questions in IBPS and SBI PO & Clerk exams. Seeing 14.28% and thinking 1/7 turns a long calculation into a single division.</p></div>
    <Card className="p-5 md:p-7"><h2 className="text-xl font-bold">Choose your practice</h2><p className="mt-1 text-sm text-slate-500">Percentages are shown to 2 decimals. Answer with 14.28 or 14.29, the mixed form 14 2/7, or any equal fraction. Facts you missed before come up more often.</p>
      <div className="mt-5 space-y-5">
        <div><div className="text-xs font-bold uppercase tracking-wider text-slate-500">Fraction sets</div><div className="mt-2 grid gap-2 sm:grid-cols-3">{fractionSets.map((set) => <ChoiceButton key={set.id} active={sets.includes(set.id)} onClick={() => toggleSet(set.id)} title={set.title} detail={set.description} />)}</div></div>
        <div><div className="text-xs font-bold uppercase tracking-wider text-slate-500">Question type</div><div className="mt-2 grid gap-2 sm:grid-cols-3">{directions.map((item) => <ChoiceButton key={item.id} active={direction === item.id} onClick={() => setDirection(item.id)} title={item.title} detail={item.detail} />)}</div></div>
        <div className="flex flex-wrap items-end gap-5"><div><div className="text-xs font-bold uppercase tracking-wider text-slate-500">Questions</div><div className="mt-2 grid grid-cols-3 gap-2">{[10, 20, 30].map((value) => <button key={value} onClick={() => setCount(value)} className={cn('rounded-xl border px-5 py-3 text-sm font-semibold', count === value ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 dark:border-slate-800')}>{value}</button>)}</div></div><Button size="lg" onClick={start} disabled={!sets.length}><Play className="size-4 fill-current" /> Start practice</Button></div>
      </div>
    </Card>
    <section><div className="mb-4"><h2 className="text-xl font-bold">How these show up in the exam</h2><p className="mt-1 text-sm text-slate-500">Each shortcut swaps a percentage for its fraction.</p></div><div className="grid gap-3 md:grid-cols-2">{examTips.map((tip) => <Card key={tip.rule} className="flex gap-3 p-4"><Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-500" /><div><div className="font-semibold">{tip.rule}</div><div className="mt-1 text-sm text-slate-500">{tip.example}</div></div></Card>)}</div></section>
    {fractionSets.map((set) => <section key={set.id}><div className="mb-4"><h2 className="text-xl font-bold">{set.title}</h2><p className="mt-1 text-sm text-slate-500">{set.description}</p></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">{fractionFacts.filter((item) => item.set === set.id).map((item) => { const mixed = mixedPercent(item); return <Card key={fractionLabel(item)} className="p-4 text-center"><div className="text-sm text-slate-400">{fractionLabel(item)}</div><div className="mt-1 text-lg font-bold">{decimalPercent(item)}%</div>{mixed && <div className="text-xs text-slate-500">{mixed}%</div>}</Card>; })}</div></section>)}
  </div>;
}
