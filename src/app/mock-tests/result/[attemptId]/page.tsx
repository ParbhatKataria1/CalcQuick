'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, ListChecks, Loader2, RotateCcw, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { mockApi } from '@/lib/mock-api';
import { formatClock, formatScore, isAttempted } from '@/lib/mock-scoring';
import { useLoad } from '@/lib/use-load';
import { cn } from '@/lib/utils';
import { MARKS_WRONG, sectionLabel } from '@/types/mock-test';

export default function MockResultPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = use(params);
  const { data, error } = useLoad(async () => {
    const attempt = await mockApi.getAttempt(attemptId);
    return { attempt, test: await mockApi.getTest(attempt.testId) };
  }, attemptId);

  if (!data) return error ? <ResultMissing message={error} /> : <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="size-4 animate-spin" /> Loading result…</div>;
  const { attempt, test } = data;
  if (!attempt.endedAt) return <ResultMissing message="This test hasn't been submitted yet." resumeHref={`/mock-tests/test/${test.id}`} />;

  const correct = attempt.sectionScores.reduce((sum, item) => sum + item.correct, 0);
  const wrong = attempt.sectionScores.reduce((sum, item) => sum + item.wrong, 0);
  const attempted = correct + wrong;
  const timeMs = attempt.sectionScores.reduce((sum, item) => sum + item.timeMs, 0);

  // Accuracy by topic shows what to practise next.
  const topics = new Map<string, { correct: number; total: number }>();
  test.sections.forEach((section, sectionIndex) => section.questions.forEach((question, index) => {
    const entry = topics.get(question.topic) ?? { correct: 0, total: 0 };
    const response = attempt.responses[sectionIndex][index];
    entry.total++;
    if (isAttempted(response) && response.selected === question.answerIndex) entry.correct++;
    topics.set(question.topic, entry);
  }));
  const topicRows = [...topics.entries()].sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href="/mock-tests" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400"><ArrowLeft className="size-4" /> Mock tests</Link>
      <div className="rounded-3xl bg-slate-950 p-7 text-white md:p-10">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-indigo-300"><Trophy className="size-4" /> Result</div>
        <h1 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">{attempt.testName}</h1>
        <div className="mt-6 flex flex-wrap items-end gap-x-10 gap-y-4">
          <div><div className="text-5xl font-bold">{formatScore(attempt.score)}</div><div className="mt-1 text-sm text-slate-400">out of {attempt.maxScore}</div></div>
          <Stat label="Accuracy" value={attempted ? `${Math.round((correct / attempted) * 100)}%` : '—'} />
          <Stat label="Attempted" value={`${attempted}/${attempt.maxScore}`} />
          <Stat label="Negative marks" value={formatScore(wrong * MARKS_WRONG)} />
          <Stat label="Time taken" value={formatClock(timeMs / 1000)} />
        </div>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">
            <tr>{['Section', 'Score', 'Correct', 'Wrong', 'Skipped', 'Accuracy', 'Time'].map((heading) => <th key={heading} className="px-4 py-3 font-bold">{heading}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {attempt.sectionScores.map((item) => (
              <tr key={item.section}>
                <td className="px-4 py-3 font-semibold">{sectionLabel[item.section]}</td>
                <td className="px-4 py-3 font-bold">{formatScore(item.score)} <span className="font-medium text-slate-400">/ {item.total}</span></td>
                <td className="px-4 py-3 text-emerald-700 dark:text-emerald-300">{item.correct}</td>
                <td className="px-4 py-3 text-rose-600 dark:text-rose-400">{item.wrong}</td>
                <td className="px-4 py-3 text-slate-500">{item.skipped}</td>
                <td className="px-4 py-3">{item.correct + item.wrong ? `${Math.round((item.correct / (item.correct + item.wrong)) * 100)}%` : '—'}</td>
                <td className="px-4 py-3 tabular-nums">{formatClock(item.timeMs / 1000)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="p-5">
        <h2 className="font-bold">By topic</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Weakest first.</p>
        <div className="mt-4 grid gap-x-8 gap-y-3 md:grid-cols-2">
          {topicRows.map(([topic, entry]) => {
            const percent = Math.round((entry.correct / entry.total) * 100);
            return (
              <div key={topic}>
                <div className="flex justify-between text-sm"><span className="font-medium">{topic}</span><span className="text-slate-500">{entry.correct}/{entry.total}</span></div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className={cn('h-full rounded-full', percent >= 70 ? 'bg-emerald-500' : percent >= 40 ? 'bg-amber-500' : 'bg-rose-500')} style={{ width: `${percent}%` }} /></div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="flex flex-wrap justify-center gap-3">
        <Link href={`/mock-tests/result/${attempt.id}/solutions`}><Button><ListChecks className="size-4" /> View solutions</Button></Link>
        <Link href={`/mock-tests/${attempt.sourceId}`}><Button variant="outline"><RotateCcw className="size-4" /> Generate another test</Button></Link>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div><div className="text-2xl font-bold">{value}</div><div className="mt-1 text-sm text-slate-400">{label}</div></div>;
}

function ResultMissing({ message, resumeHref }: { message: string; resumeHref?: string }) {
  return (
    <Card className="mx-auto max-w-xl p-8 text-center">
      <h1 className="text-xl font-bold">Result not available</h1>
      <p className="mt-2 text-sm text-slate-500">{message}</p>
      <div className="mt-5 flex justify-center gap-2">
        {resumeHref && <Link href={resumeHref}><Button>Resume test</Button></Link>}
        <Link href="/mock-tests"><Button variant="outline"><ArrowLeft className="size-4" /> Mock tests</Button></Link>
      </div>
    </Card>
  );
}
