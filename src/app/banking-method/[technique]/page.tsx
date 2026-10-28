import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Lightbulb } from 'lucide-react';
import { BankingPracticeLauncher } from '@/components/banking-practice-launcher';
import { Card } from '@/components/ui/card';
import { bankingTechniques } from '@/constants/banking-techniques';

export function generateStaticParams() { return bankingTechniques.map(({ id }) => ({ technique: id })); }

export default async function BankingTechniquePage({ params }: { params: Promise<{ technique: string }> }) {
  const { technique: id } = await params;
  const technique = bankingTechniques.find((item) => item.id === id);
  if (!technique) notFound();
  const next = bankingTechniques[technique.number] ?? null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href="/banking-method" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400"><ArrowLeft className="size-4" /> All banking lessons</Link>
      <div className="rounded-3xl bg-slate-950 p-7 text-white md:p-10"><div className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-300">Technique {technique.number} of 5</div><h1 className="mt-3 text-3xl font-bold tracking-tight">{technique.title}</h1><p className="mt-3 max-w-3xl text-lg leading-8 text-slate-300">{technique.shortDescription}</p></div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_0.6fr]"><Card className="p-6"><h2 className="text-xl font-bold">The method</h2><p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">{technique.principle}</p><h3 className="mt-6 font-bold">Why it works</h3><p className="mt-2 leading-7 text-slate-600 dark:text-slate-300">{technique.whyItWorks}</p></Card><Card className="p-6"><div className="flex items-center gap-2 font-bold"><Lightbulb className="size-5 text-amber-500" /> Recognition cues</div><ul className="mt-4 space-y-3">{technique.cues.map((cue) => <li key={cue} className="flex gap-2 text-sm leading-6 text-slate-600 dark:text-slate-300"><CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-500" />{cue}</li>)}</ul></Card></div>

      <section><h2 className="mb-4 text-xl font-bold">Worked examples</h2><div className="grid gap-4 md:grid-cols-2">{technique.examples.map((example) => <Card key={example.problem} className="overflow-hidden"><div className="border-b border-slate-200 bg-slate-50 px-5 py-4 text-xl font-bold dark:border-slate-800 dark:bg-slate-900">{example.problem}</div><div className="space-y-2 p-5">{example.steps.map((step, index) => <div key={step} className="flex gap-3 text-sm text-slate-600 dark:text-slate-300"><span className="font-bold text-slate-400">{index + 1}</span><span>{step}</span></div>)}<div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">Answer: {example.answer}</div></div></Card>)}</div></section>

      <Card className="flex flex-col items-start justify-between gap-4 border-indigo-200 bg-indigo-50 p-6 dark:border-indigo-900 dark:bg-indigo-950/30 sm:flex-row sm:items-center"><div><h2 className="font-bold">Turn the method into automatic recall</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Start a focused 10-question medium drill on this technique.</p></div><BankingPracticeLauncher technique={technique.id} /></Card>

      {next && <Link href={`/banking-method/${next.id}`} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900"><div><div className="text-xs font-bold uppercase tracking-wider text-slate-400">Next technique</div><div className="mt-1 font-bold">{next.number}. {next.title}</div></div><span className="text-sm font-semibold text-indigo-600">Continue →</span></Link>}
    </div>
  );
}
