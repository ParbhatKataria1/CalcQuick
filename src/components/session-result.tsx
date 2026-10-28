'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RotateCcw, SearchX, Trash2, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useStats } from '@/context/stats-context';

type Props = {
  sessionId: string;
  /** The setup screen this session was started from. */
  setupHref: string;
  /** The session route, without a query; mistakes are retried at `${sessionHref}?retry=…`. */
  sessionHref: string;
};

export function SessionResult({ sessionId, setupHref, sessionHref }: Props) {
  const router = useRouter();
  const { stats, hydrated, deleteSession } = useStats();
  if (!hydrated) return null;

  const session = stats.sessions.find((item) => item.id === sessionId);
  if (!session) {
    return (
      <Card className="mx-auto max-w-xl p-10 text-center">
        <SearchX className="mx-auto size-9 text-slate-300" />
        <h1 className="mt-4 text-xl font-bold">Session not found</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">This result is no longer in your history on this device.</p>
        <Link href={setupHref} className="mt-6 inline-block"><Button variant="outline"><ArrowLeft className="size-4" /> Back to setup</Button></Link>
      </Card>
    );
  }

  const records = stats.answers.filter((answer) => answer.sessionId === sessionId);
  const remove = () => {
    if (!window.confirm('Delete this session? Its answers and XP are removed from your progress.')) return;
    router.replace(setupHref);
    deleteSession(sessionId);
  };
  const mistakes = records.filter((record) => !record.correct);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
          <Trophy className="size-8" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Session complete</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">Good repetition. Review the misses, then attack them again.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ResultMetric label="Questions" value={session.total.toString()} />
        <ResultMetric label="Accuracy" value={`${Math.round(session.accuracy)}%`} />
        <ResultMetric label="Average time" value={`${(session.averageTimeMs / 1000).toFixed(1)}s`} />
        <ResultMetric label="Best time" value={`${(session.bestTimeMs / 1000).toFixed(1)}s`} />
        <ResultMetric label="Correct" value={session.correct.toString()} />
        <ResultMetric label="Incorrect" value={session.incorrect.toString()} />
        <ResultMetric label="Best streak" value={session.bestStreak.toString()} />
        <ResultMetric label="XP earned" value={`+${session.xpEarned}`} />
      </div>

      {mistakes.length > 0 ? (
        <Card className="overflow-hidden">
          <div className="border-b border-slate-200 dark:border-slate-800 px-5 py-4">
            <h2 className="font-bold">Mistake review</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">These are the questions worth repeating immediately.</p>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {mistakes.map((record) => (
              <div key={`${record.id}-${record.timestamp}`} className="grid gap-3 px-5 py-4 text-sm sm:grid-cols-[1fr_auto_auto_auto] sm:items-center">
                <div className="font-semibold text-slate-900 dark:text-slate-100">{record.prompt}</div>
                <div><span className="text-slate-400 dark:text-slate-500">You:</span> <span className="font-semibold text-rose-600 dark:text-rose-400">{record.userAnswer}</span></div>
                <div><span className="text-slate-400 dark:text-slate-500">Correct:</span> <span className="font-semibold text-emerald-700 dark:text-emerald-300">{record.correctAnswer}</span></div>
                <div className="text-slate-500 dark:text-slate-400">{(record.responseTimeMs / 1000).toFixed(1)}s</div>
              </div>
            ))}
          </div>
        </Card>
      ) : session.incorrect === 0 ? (
        <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-5 text-center text-emerald-800 dark:text-emerald-200">
          <div className="font-bold">Perfect round — no mistakes to review.</div>
        </Card>
      ) : null}

      <div className="flex flex-wrap justify-center gap-3">
        {mistakes.length > 0 && <Link href={`${sessionHref}?retry=${encodeURIComponent(sessionId)}`}><Button variant="secondary"><RotateCcw className="size-4" /> Practice Mistakes Again</Button></Link>}
        <Link href={setupHref}><Button variant="outline"><ArrowLeft className="size-4" /> Back to setup</Button></Link>
        <Button variant="ghost" onClick={remove} className="text-rose-600 hover:text-rose-700 dark:text-rose-400"><Trash2 className="size-4" /> Delete session</Button>
      </div>
    </div>
  );
}

function ResultMetric({ label, value }: { label: string; value: string }) {
  return <Card className="p-4 text-center"><div className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</div><div className="mt-2 text-2xl font-bold text-slate-950 dark:text-slate-50">{value}</div></Card>;
}
