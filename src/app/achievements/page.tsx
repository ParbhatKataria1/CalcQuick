'use client';

import { Award, Clock3, Flame, Medal, Star, Target, Trophy, Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useStats } from '@/context/stats-context';
import { cn } from '@/lib/utils';

export default function AchievementsPage() {
  const { stats } = useStats();
  const pb = stats.personalBests;
  const achievements = [
    { title: 'First 100', detail: 'Attempt 100 calculations', unlocked: stats.totalQuestions >= 100, icon: Target },
    { title: 'Accuracy 90', detail: 'Finish a session at 90%+ accuracy', unlocked: pb.highestAccuracy >= 90, icon: Medal },
    { title: 'Perfect Round', detail: 'Finish a session at 100% accuracy', unlocked: pb.highestAccuracy >= 100, icon: Star },
    { title: '10 Streak', detail: 'Answer 10 in a row correctly', unlocked: pb.longestStreak >= 10, icon: Flame },
    { title: '25 Streak', detail: 'Answer 25 in a row correctly', unlocked: pb.longestStreak >= 25, icon: Trophy },
    { title: 'Sub-3 Average', detail: 'Average under 3 seconds in a session', unlocked: Boolean(pb.fastestAverageMs && pb.fastestAverageMs < 3000), icon: Zap },
    { title: '1-Minute Sprint', detail: 'Attempt 20+ in a 1-minute challenge', unlocked: pb.oneMinuteQuestions >= 20, icon: Clock3 },
    { title: '1000 Questions', detail: 'Attempt 1,000 calculations', unlocked: stats.totalQuestions >= 1000, icon: Award },
  ];

  return (
    <div className="space-y-6">
      <div><div className="mb-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400">Personal bests</div><h1 className="text-3xl font-bold tracking-tight">Achievements</h1><p className="mt-2 text-slate-600 dark:text-slate-300">Milestones should reward useful habits: accuracy, speed and repeated practice.</p></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PB label="Highest accuracy" value={`${pb.highestAccuracy.toFixed(0)}%`} />
        <PB label="Fastest average" value={pb.fastestAverageMs ? `${(pb.fastestAverageMs / 1000).toFixed(1)}s` : '—'} />
        <PB label="Longest correct streak" value={String(pb.longestStreak)} />
        <PB label="Best 1-minute sprint" value={`${pb.oneMinuteQuestions} questions`} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {achievements.map((item) => { const Icon = item.icon; return <Card key={item.title} className={cn('p-5 transition-all', !item.unlocked && 'opacity-55')}><div className={cn('flex size-11 items-center justify-center rounded-2xl', item.unlocked ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500')}><Icon className="size-5" /></div><div className="mt-4 font-bold">{item.title}</div><div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.detail}</div><div className={cn('mt-4 text-xs font-bold uppercase tracking-wide', item.unlocked ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500')}>{item.unlocked ? 'Unlocked' : 'Locked'}</div></Card>; })}
      </div>
    </div>
  );
}

function PB({ label, value }: { label: string; value: string }) { return <Card className="p-4"><div className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</div><div className="mt-2 text-2xl font-bold">{value}</div></Card>; }
