'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { CheckCircle2, Clock3, Play, Target, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useStats } from '@/context/stats-context';

const dateKey = (timestamp: number) => new Date(timestamp).toLocaleDateString('en-CA');

export default function DailyChallengePage() {
  const { stats } = useStats();
  const today = new Date().toLocaleDateString('en-CA');
  const todaySessions = useMemo(() => stats.sessions.filter((session) => dateKey(session.endedAt) === today), [stats.sessions, today]);
  const todayQuestions = todaySessions.reduce((sum, session) => sum + session.total, 0);
  const todayCorrect = todaySessions.reduce((sum, session) => sum + session.correct, 0);
  const accuracy = todayQuestions ? (todayCorrect / todayQuestions) * 100 : 0;
  const totalTime = todaySessions.reduce((sum, session) => sum + session.averageTimeMs * session.total, 0);
  const averageTime = todayQuestions ? totalTime / todayQuestions : 0;
  const complete = todayQuestions >= 50 && accuracy >= 90 && averageTime < 5000;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300"><Target className="size-3.5" /> Daily consistency</div>
        <h1 className="text-3xl font-bold tracking-tight">Today&apos;s Challenge</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">A measurable daily target for building calculation speed without letting accuracy collapse.</p>
      </div>

      <Card className="overflow-hidden">
        <div className="bg-slate-950 p-6 text-white md:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-indigo-300">Daily target</div>
              <div className="mt-1 text-3xl font-bold">Solve 50 questions</div>
              <div className="mt-2 text-sm text-slate-300">Accuracy ≥ 90% • Average response &lt; 5 seconds</div>
            </div>
            <div className="rounded-2xl bg-white/10 px-5 py-4 text-center">
              <Trophy className="mx-auto size-5 text-amber-300" />
              <div className="mt-2 text-xl font-bold">+500 XP goal</div>
            </div>
          </div>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-3 md:p-7">
          <ProgressMetric label="Questions" value={`${todayQuestions}/50`} progress={Math.min(100, (todayQuestions / 50) * 100)} icon={Target} />
          <ProgressMetric label="Accuracy" value={`${accuracy.toFixed(0)}%`} progress={Math.min(100, accuracy)} icon={CheckCircle2} />
          <ProgressMetric label="Avg. time" value={averageTime ? `${(averageTime / 1000).toFixed(1)}s` : '—'} progress={averageTime ? Math.min(100, (5000 / averageTime) * 100) : 0} icon={Clock3} />
        </div>
      </Card>

      <Card className={`p-5 md:p-6 ${complete ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40' : ''}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className={`text-xs font-bold uppercase tracking-wider ${complete ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>{complete ? 'Completed' : todayQuestions ? 'In progress' : 'Not started'}</div>
            <h2 className="mt-1 text-xl font-bold">{complete ? 'Daily challenge cleared.' : 'Continue with a focused mixed round.'}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">The challenge aggregates all of today&apos;s completed sessions.</p>
          </div>
          <Link href="/daily-challenge/session"><Button size="lg"><Play className="size-4 fill-current" /> {todayQuestions ? 'Continue Challenge' : 'Start Challenge'}</Button></Link>
        </div>
      </Card>
    </div>
  );
}

function ProgressMetric({ label, value, progress, icon: Icon }: { label: string; value: string; progress: number; icon: typeof Target }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
      <div className="flex items-center justify-between"><div className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</div><Icon className="size-4 text-indigo-500" /></div>
      <div className="mt-3 text-2xl font-bold">{value}</div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-indigo-600" style={{ width: `${progress}%` }} /></div>
    </div>
  );
}
