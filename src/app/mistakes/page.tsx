'use client';

import { AlertCircle, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useStats } from '@/context/stats-context';
import { categoryLabel } from '@/constants/categories';
import { SessionEngine } from '@/components/session-engine';
import { recordToQuestion } from '@/lib/review';
import type { Question, SessionConfig } from '@/types';

export default function MistakesPage() {
  const { stats } = useStats();
  const [retry, setRetry] = useState<{ config: SessionConfig; questions: Question[] } | null>(null);
  const mistakes = useMemo(() => [...stats.answers].filter((answer) => !answer.correct).reverse().slice(0, 50), [stats.answers]);

  if (retry) return <SessionEngine config={retry.config} initialQuestions={retry.questions} onExit={() => setRetry(null)} />;

  const startRetry = () => {
    const selected = mistakes.slice(0, 20).map((record) => recordToQuestion(record, 'mistake'));
    if (!selected.length) return;
    setRetry({ config: { category: 'mixed', difficulty: 'medium', questionCount: selected.length, mode: 'mistakes' }, questions: selected });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><div className="mb-2 text-sm font-semibold text-rose-600 dark:text-rose-400">Review loop</div><h1 className="text-3xl font-bold tracking-tight">Mistakes</h1><p className="mt-2 text-slate-600 dark:text-slate-300">The fastest way to remove recurring calculation errors is to repeat them while they are still fresh.</p></div>
        {mistakes.length > 0 && <Button onClick={startRetry}><RotateCcw className="size-4" /> Retry recent mistakes</Button>}
      </div>

      {mistakes.length ? (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 sm:grid-cols-[140px_1fr_120px_120px_80px]">
            <span className="hidden sm:block">Category</span><span>Question</span><span className="hidden sm:block">Your answer</span><span className="hidden sm:block">Correct</span><span className="text-right">Time</span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {mistakes.map((record) => (
              <div key={`${record.id}-${record.timestamp}`} className="grid grid-cols-[1fr_auto] gap-3 px-5 py-4 text-sm sm:grid-cols-[140px_1fr_120px_120px_80px] sm:items-center">
                <span className="hidden text-xs font-semibold text-slate-500 dark:text-slate-400 sm:block">{categoryLabel(record.category)}</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{record.prompt}</span>
                <span className="hidden font-semibold text-rose-600 dark:text-rose-400 sm:block">{record.userAnswer}</span>
                <span className="hidden font-semibold text-emerald-700 dark:text-emerald-300 sm:block">{record.correctAnswer}</span>
                <span className="text-right text-slate-500 dark:text-slate-400">{(record.responseTimeMs / 1000).toFixed(1)}s</span>
                <div className="col-span-2 flex gap-4 text-xs sm:hidden"><span className="text-rose-600 dark:text-rose-400">You: {record.userAnswer}</span><span className="text-emerald-700 dark:text-emerald-300">Correct: {record.correctAnswer}</span></div>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card className="p-10 text-center"><AlertCircle className="mx-auto size-9 text-slate-300" /><h2 className="mt-4 font-bold">No mistakes recorded yet</h2><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Complete a practice session and incorrect answers will appear here automatically.</p></Card>
      )}
    </div>
  );
}
