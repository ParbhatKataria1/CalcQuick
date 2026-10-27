'use client';

import { use } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Check, Loader2, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { RichText } from '@/components/exam/rich-text';
import { mockApi } from '@/lib/mock-api';
import { formatClock, isAttempted } from '@/lib/mock-scoring';
import { useLoad } from '@/lib/use-load';
import { cn } from '@/lib/utils';
import { sectionLabel } from '@/types/mock-test';

const FILTERS = ['all', 'wrong', 'skipped', 'correct'] as const;
type Filter = (typeof FILTERS)[number];

export default function SolutionsPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = use(params);
  const search = useSearchParams();
  const { data, error } = useLoad(async () => {
    const attempt = await mockApi.getAttempt(attemptId);
    return { attempt, test: await mockApi.getTest(attempt.testId) };
  }, attemptId);

  if (!data) return error ? <p className="text-sm text-rose-600">{error}</p> : <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="size-4 animate-spin" /> Loading solutions…</div>;
  const { attempt, test } = data;
  const sectionIndex = Math.min(Math.max(0, Number(search.get('section')) || 0), test.sections.length - 1);
  const filter: Filter = FILTERS.includes(search.get('filter') as Filter) ? (search.get('filter') as Filter) : 'all';
  const section = test.sections[sectionIndex];
  const href = (next: { section?: number; filter?: Filter }) => `/mock-tests/result/${attempt.id}/solutions?section=${next.section ?? sectionIndex}&filter=${next.filter ?? filter}`;

  const rows = section.questions.map((question, index) => {
    const response = attempt.responses[sectionIndex][index];
    const selected = isAttempted(response) ? response.selected : null;
    const outcome: Exclude<Filter, 'all'> = selected === null ? 'skipped' : selected === question.answerIndex ? 'correct' : 'wrong';
    return { question, index, selected, outcome, timeMs: response.timeMs };
  }).filter((row) => filter === 'all' || row.outcome === filter);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link href={`/mock-tests/result/${attempt.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400"><ArrowLeft className="size-4" /> Result</Link>
      <h1 className="text-3xl font-bold tracking-tight">Solutions</h1>

      <div className="flex flex-wrap gap-2">
        {test.sections.map((item, index) => (
          <Link key={item.section} href={href({ section: index })} className={cn('rounded-xl px-4 py-2 text-sm font-semibold', index === sectionIndex ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800')}>{sectionLabel[item.section]}</Link>
        ))}
      </div>
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        {FILTERS.map((item) => (
          <Link key={item} href={href({ filter: item })} className={cn('flex-1 rounded-lg px-3 py-1.5 text-center text-sm font-semibold capitalize', item === filter ? 'bg-white text-slate-950 shadow-sm dark:bg-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400')}>{item}</Link>
        ))}
      </div>

      {rows.length ? rows.map(({ question, index, selected, outcome, timeMs }) => {
        const showPassage = question.passage && (index === 0 || section.questions[index - 1].setId !== question.setId || filter !== 'all');
        return (
          <Card key={index} className="p-5">
            <div className="flex items-center justify-between gap-3 text-xs font-semibold">
              <span className="text-slate-500">Q{index + 1} · {question.topic} · {formatClock(timeMs / 1000)}</span>
              <span className={cn('rounded-full px-2.5 py-1 capitalize', outcome === 'correct' && 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200', outcome === 'wrong' && 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200', outcome === 'skipped' && 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300')}>{outcome}</span>
            </div>
            {showPassage && <RichText text={question.passage!} className="mt-3 rounded-xl bg-slate-50 p-3 text-sm leading-6 dark:bg-slate-800/50" />}
            <RichText text={question.text} className="mt-3 font-medium leading-7" />
            <ol className="mt-3 space-y-1.5 text-sm">
              {question.options.map((option, optionIndex) => {
                const isAnswer = optionIndex === question.answerIndex;
                const isChosenWrong = optionIndex === selected && !isAnswer;
                return (
                  <li key={optionIndex} className={cn('flex items-start gap-2 rounded-lg px-3 py-2 ring-1 ring-slate-200 dark:ring-slate-800', isAnswer && 'bg-emerald-50 ring-emerald-300 dark:bg-emerald-950/40 dark:ring-emerald-800', isChosenWrong && 'bg-rose-50 ring-rose-300 dark:bg-rose-950/40 dark:ring-rose-800')}>
                    <span className="w-4 shrink-0 font-semibold">{String.fromCharCode(65 + optionIndex)}.</span>
                    <RichText text={option} className="flex-1" />
                    {isAnswer && <Check className="size-4 shrink-0 text-emerald-600" />}
                    {isChosenWrong && <X className="size-4 shrink-0 text-rose-600" />}
                  </li>
                );
              })}
            </ol>
            {question.explanation && (
              <div className="mt-4 rounded-xl bg-indigo-50 p-3 text-sm leading-6 dark:bg-indigo-950/30">
                <div className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">Solution</div>
                <RichText text={question.explanation} className="mt-1" />
              </div>
            )}
          </Card>
        );
      }) : <Card className="p-8 text-center text-sm text-slate-500">No {filter} questions in this section.</Card>}
    </div>
  );
}
