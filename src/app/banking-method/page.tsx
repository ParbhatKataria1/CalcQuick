import Link from 'next/link';
import { ArrowRight, BookOpen, BrainCircuit, Play } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { bankingSpeedTargets, bankingTechniques } from '@/constants/banking-techniques';

export default function BankingMethodPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-7 text-white md:p-10">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-white/10 text-indigo-300"><BrainCircuit className="size-6" /></div>
        <div className="mt-6 max-w-3xl"><div className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-300">Banking exam theory</div><h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">Calculate faster by doing less</h1><p className="mt-4 text-base leading-7 text-slate-300 md:text-lg">Fast candidates are usually not thinking dramatically faster. They recognize patterns, retrieve known relationships, and perform fewer mental operations.</p></div>
        <div className="mt-7 flex flex-wrap gap-3"><Link href="/banking-drill" className="inline-flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-500"><Play className="size-4 fill-current" /> Start complete practice</Link><a href="#techniques" className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/15 px-5 text-sm font-semibold text-slate-200 hover:bg-white/10"><BookOpen className="size-4" /> Read the method</a></div>
      </div>

      <section id="techniques"><div className="mb-4"><h2 className="text-2xl font-bold">Train these five techniques in order</h2><p className="mt-2 text-slate-500 dark:text-slate-400">Each lesson includes the idea, worked examples, recognition cues, and a focused drill.</p></div>
        <div className="space-y-3">{bankingTechniques.map((technique) => <Link key={technique.id} href={`/banking-method/${technique.id}`} className="group grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-700 sm:grid-cols-[auto_1fr_auto] sm:items-center"><div className="flex size-11 items-center justify-center rounded-xl bg-indigo-50 font-bold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">{technique.number}</div><div><h3 className="font-bold">{technique.title}</h3><p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{technique.shortDescription}</p></div><span className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-300">Open lesson <ArrowRight className="size-4 transition group-hover:translate-x-1" /></span></Link>)}</div>
      </section>

      <Card className="overflow-hidden"><div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800"><h2 className="text-xl font-bold">Recommended speed targets</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">A progression suited to SBI Clerk, IBPS Clerk, and RRB-style preparation.</p></div><div className="grid sm:grid-cols-2 lg:grid-cols-3">{bankingSpeedTargets.map(([skill, target]) => <div key={skill} className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 text-sm dark:border-slate-800"><span className="font-medium">{skill}</span><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{target}</span></div>)}</div></Card>

      <Card className="border-indigo-200 bg-indigo-50 p-6 dark:border-indigo-900 dark:bg-indigo-950/30"><h2 className="font-bold text-indigo-950 dark:text-indigo-100">The real goal: retrieval + pattern recognition</h2><p className="mt-2 max-w-4xl leading-7 text-indigo-900/70 dark:text-indigo-200/80">An experienced calculator sees 796 + 398 as 796 + 400 − 2. Expertise changes the strategy: suitable results and patterns are retrieved instead of rebuilding every answer with a slow procedure.</p></Card>
    </div>
  );
}
