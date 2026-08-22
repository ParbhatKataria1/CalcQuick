'use client';

import { useMemo } from 'react';
import { BarChart3, Clock3, Target, Trophy } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from 'recharts';
import { Card } from '@/components/ui/card';
import { useStats } from '@/context/stats-context';
import { categoryLabel } from '@/constants/categories';
import { getCategoryPerformance, getDailySeries, getStrongestAndWeakest } from '@/lib/stats';

export default function AnalyticsPage() {
  const { stats } = useStats();
  const daily = useMemo(() => getDailySeries(stats, 14), [stats]);
  const performance = useMemo(() => getCategoryPerformance(stats).filter((item) => item.attempts > 0).sort((a, b) => b.attempts - a.attempts), [stats]);
  const { strongest, weakest } = getStrongestAndWeakest(stats);
  const overallAccuracy = stats.totalQuestions ? (stats.totalCorrect / stats.totalQuestions) * 100 : 0;
  const avgTime = stats.totalQuestions ? stats.totalResponseTimeMs / stats.totalQuestions : 0;

  if (!stats.totalQuestions) {
    return <EmptyAnalytics />;
  }

  return (
    <div className="space-y-6">
      <div><div className="mb-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400">Performance analytics</div><h1 className="text-3xl font-bold tracking-tight">Measure what is getting faster.</h1><p className="mt-2 text-slate-600 dark:text-slate-300">Accuracy matters first. Speed matters once the answer is reliable.</p></div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Target} label="Overall accuracy" value={`${overallAccuracy.toFixed(1)}%`} />
        <Metric icon={Clock3} label="Average response" value={`${(avgTime / 1000).toFixed(1)}s`} />
        <Metric icon={Trophy} label="Strongest" value={strongest ? categoryLabel(strongest.category) : '—'} small />
        <Metric icon={BarChart3} label="Weakest" value={weakest ? categoryLabel(weakest.category) : '—'} small />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard title="Accuracy trend" subtitle="Daily percentage of correct answers">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={daily}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" tickLine={false} axisLine={false} /><YAxis domain={[0, 100]} tickLine={false} axisLine={false} /><Tooltip /><Line type="monotone" dataKey="accuracy" stroke="#4f46e5" strokeWidth={3} dot={false} /></LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Speed trend" subtitle="Lower average response time is better">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={daily}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" tickLine={false} axisLine={false} /><YAxis tickLine={false} axisLine={false} /><Tooltip /><Line type="monotone" dataKey="avgSeconds" stroke="#0f766e" strokeWidth={3} dot={false} /></LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <ChartCard title="Daily practice activity" subtitle="Questions solved per day">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={daily}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" tickLine={false} axisLine={false} /><YAxis tickLine={false} axisLine={false} /><Tooltip /><Bar dataKey="questions" fill="#6366f1" radius={[8, 8, 0, 0]} /></BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <Card className="overflow-hidden">
          <div className="border-b border-slate-200 dark:border-slate-800 px-5 py-4"><h2 className="font-bold">Category performance</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Accuracy and speed by calculation type.</p></div>
          <div className="max-h-[330px] divide-y divide-slate-100 dark:divide-slate-800 overflow-auto">
            {performance.map((item) => <div key={item.category} className="grid grid-cols-[1fr_auto] gap-3 px-5 py-4 text-sm"><div><div className="font-semibold">{categoryLabel(item.category)}</div><div className="mt-1 text-xs text-slate-400 dark:text-slate-500">{item.attempts} attempts</div></div><div className="text-right"><div className="font-bold text-slate-900 dark:text-slate-100">{item.accuracy.toFixed(0)}%</div><div className="mt-1 text-xs text-slate-400 dark:text-slate-500">{(item.averageTimeMs / 1000).toFixed(1)}s avg</div></div></div>)}
          </div>
        </Card>
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <Card className="p-5"><h2 className="font-bold">{title}</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p><div className="mt-5 -ml-4">{children}</div></Card>;
}

function Metric({ icon: Icon, label, value, small = false }: { icon: typeof Target; label: string; value: string; small?: boolean }) {
  return <Card className="p-4"><div className="flex items-center justify-between"><div><div className="text-xs font-semibold text-slate-400 dark:text-slate-500">{label}</div><div className={`${small ? 'text-lg' : 'text-2xl'} mt-2 font-bold`}>{value}</div></div><div className="flex size-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400"><Icon className="size-4" /></div></div></Card>;
}

function EmptyAnalytics() {
  return <Card className="p-12 text-center"><BarChart3 className="mx-auto size-10 text-slate-300" /><h1 className="mt-4 text-2xl font-bold">Analytics will appear after your first session</h1><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">Your calculation history stays on this device. Once you start practicing, this page will show accuracy, speed and daily activity trends.</p></Card>;
}
