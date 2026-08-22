'use client';

import Link from 'next/link';
import { ArrowRight, BarChart3, Clock3, Gauge, Play, Sparkles, Target, Trophy, Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useStats } from '@/context/stats-context';
import { categoryLabel } from '@/constants/categories';
import { formatSeconds } from '@/lib/utils';
import { getDailySeries, getLevel, getStrongestAndWeakest, getWeakCategories } from '@/lib/stats';

export default function DashboardPage() {
  const { stats } = useStats();
  const accuracy = stats.totalQuestions ? (stats.totalCorrect / stats.totalQuestions) * 100 : 0;
  const avg = stats.totalQuestions ? stats.totalResponseTimeMs / stats.totalQuestions : 0;
  const level = getLevel(stats.xp);
  const { strongest, weakest } = getStrongestAndWeakest(stats);
  const weakCategories = getWeakCategories(stats);
  const recent = getDailySeries(stats, 7);
  const maxQuestions = Math.max(1, ...recent.map((item) => item.questions));

  if (stats.totalQuestions === 0) {
    return (
      <div className="space-y-7">
        <section className="overflow-hidden rounded-3xl bg-slate-950 px-6 py-10 text-white md:px-10 md:py-14 lg:px-14">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-indigo-200"><Sparkles className="size-3.5" /> Built for SBI • IBPS • RRB</div>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Master Calculations for Banking Exams</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 md:text-lg">Improve your calculation speed, accuracy, and confidence until common number patterns become automatic.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/speed?duration=300"><Button size="lg"><Zap className="size-4" /> Start 5-Minute Practice</Button></Link>
              <Link href="/speed"><Button size="lg" variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"><Gauge className="size-4" /> Take Speed Challenge</Button></Link>
              <Link href="/daily-challenge"><Button size="lg" variant="ghost" className="text-slate-200 hover:bg-white/10 hover:text-white"><Target className="size-4" /> View Today&apos;s Goal</Button></Link>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          <FeatureCard icon={Zap} title="Speed" text="Train with a live response timer and time-boxed challenges." />
          <FeatureCard icon={Target} title="Accuracy" text="Review every mistake and immediately repeat weak calculations." />
          <FeatureCard icon={BarChart3} title="Consistency" text="Your sessions stay on this device and build a practice history." />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <section className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400">Training dashboard</div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Keep making the numbers automatic.</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">Use speed, accuracy and consistency to decide what to train next.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {weakCategories.length > 0 && <Link href="/practice?weak=1"><Button variant="outline"><Target className="size-4" /> Practice Weak Areas</Button></Link>}
          <Link href="/practice"><Button><Play className="size-4 fill-current" /> Start Practice</Button></Link>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Questions attempted" value={stats.totalQuestions.toLocaleString()} icon={Target} />
        <StatCard label="Overall accuracy" value={`${accuracy.toFixed(1)}%`} icon={Trophy} />
        <StatCard label="Average response" value={formatSeconds(avg)} icon={Clock3} />
        <StatCard label="Best response" value={formatSeconds(stats.bestResponseTimeMs)} icon={Zap} />
        <StatCard label={`Level ${level.level}`} value={level.name} icon={Gauge} small />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.45fr_0.85fr]">
        <Card className="p-5 md:p-6">
          <div className="flex items-center justify-between">
            <div><h2 className="font-bold">Recent performance</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Questions solved during the last 7 days.</p></div>
            <Link href="/analytics" className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700">Analytics →</Link>
          </div>
          <div className="mt-8 flex h-52 items-end gap-2 sm:gap-4">
            {recent.map((item) => (
              <div key={item.fullDate} className="flex h-full flex-1 flex-col justify-end gap-2">
                <div className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400">{item.questions || ''}</div>
                <div className="relative mx-auto w-full max-w-12 flex-1 rounded-t-xl bg-slate-100 dark:bg-slate-800">
                  <div className="absolute inset-x-0 bottom-0 rounded-t-xl bg-indigo-500 transition-all" style={{ height: `${Math.max(item.questions ? 8 : 0, (item.questions / maxQuestions) * 100)}%` }} />
                </div>
                <div className="text-center text-xs font-semibold text-slate-400 dark:text-slate-500">{item.date}</div>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <PerformanceCard kind="strong" label="Strongest calculation" title={strongest ? categoryLabel(strongest.category) : 'Keep practicing'} value={strongest ? `${strongest.accuracy.toFixed(0)}% accuracy • ${(strongest.averageTimeMs / 1000).toFixed(1)}s avg` : 'More data needed'} />
          <PerformanceCard kind="weak" label="Needs attention" title={weakest ? categoryLabel(weakest.category) : 'No weak area yet'} value={weakest ? `${weakest.accuracy.toFixed(0)}% accuracy • ${(weakest.averageTimeMs / 1000).toFixed(1)}s avg` : 'Complete a few rounds'} />
          <Card className="p-5">
            <div className="flex items-center justify-between"><div><div className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Current level</div><div className="mt-1 font-bold">{level.name}</div></div><div className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{stats.xp.toLocaleString()} XP</div></div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-indigo-600" style={{ width: `${level.progress}%` }} /></div>
          </Card>
        </div>
      </div>

      <Card className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between md:p-6">
        <div><div className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Next recommended workout</div><h2 className="mt-1 text-xl font-bold">5-minute mixed speed challenge</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">A short session keeps calculation recall warm without interrupting your study plan.</p></div>
        <Link href="/speed?duration=300"><Button>Start challenge <ArrowRight className="size-4" /></Button></Link>
      </Card>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, small = false }: { label: string; value: string; icon: typeof Target; small?: boolean }) {
  return <Card className="p-4"><div className="flex items-start justify-between"><div className="min-w-0"><div className="text-xs font-semibold text-slate-400 dark:text-slate-500">{label}</div><div className={`${small ? 'text-lg' : 'text-2xl'} mt-2 truncate font-bold text-slate-950 dark:text-slate-50`}>{value}</div></div><div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400"><Icon className="size-4" /></div></div></Card>;
}

function FeatureCard({ icon: Icon, title, text }: { icon: typeof Zap; title: string; text: string }) {
  return <Card className="p-5"><div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400"><Icon className="size-5" /></div><h2 className="font-bold">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{text}</p></Card>;
}

function PerformanceCard({ kind, label, title, value }: { kind: 'strong' | 'weak'; label: string; title: string; value: string }) {
  return <Card className="p-5"><div className={`text-xs font-semibold uppercase tracking-wide ${kind === 'strong' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>{label}</div><div className="mt-2 font-bold text-slate-950 dark:text-slate-50">{title}</div><div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{value}</div></Card>;
}
