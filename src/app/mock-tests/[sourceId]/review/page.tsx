'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Check, Loader2, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { RichText } from '@/components/exam/rich-text';
import { mockApi } from '@/lib/mock-api';
import { createRng, instantiate } from '@/lib/mock-generator';
import { useLoad } from '@/lib/use-load';
import { cn } from '@/lib/utils';
import { SECTIONS, sectionLabel, type QuestionSet, type Section, type SetContent } from '@/types/mock-test';

export default function ReviewPage({ params }: { params: Promise<{ sourceId: string }> }) {
  const { sourceId } = use(params);
  const requested = useSearchParams().get('section');
  const section: Section = SECTIONS.includes(requested as Section) ? (requested as Section) : 'quant';
  const { data: source, error } = useLoad(() => mockApi.getSource(sourceId), sourceId);

  if (!source) return error ? <p className="text-sm text-rose-600">{error}</p> : <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="size-4 animate-spin" /> Loading…</div>;
  const sets = source.sets.filter((set) => set.section === section);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link href={`/mock-tests/${source.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400"><ArrowLeft className="size-4" /> {source.name}</Link>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Review questions</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">Each original from the PDF beside a new version, with the correct option ticked. Check a few before relying on a paper.</p>
      </div>
      <div className="flex gap-2">
        {SECTIONS.map((item) => (
          <Link key={item} href={`/mock-tests/${source.id}/review?section=${item}`} className={cn('rounded-xl px-4 py-2 text-sm font-semibold', item === section ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800')}>
            {sectionLabel[item].split(' ')[0]} <span className="opacity-70">({source.sets.filter((set) => set.section === item).length})</span>
          </Link>
        ))}
      </div>
      {sets.length ? sets.map((set, index) => <SetReview key={set.id} set={set} number={index + 1} />) : <Card className="p-8 text-center text-sm text-slate-500">No {sectionLabel[section]} questions in this paper.</Card>}
    </div>
  );
}

function SetReview({ set, number }: { set: QuestionSet; number: number }) {
  const [seed, setSeed] = useState(number);
  const [variantIndex, setVariantIndex] = useState(0);
  const templated = Boolean(set.templates?.length);
  const sample: SetContent | null = templated
    ? { passage: set.original.passage, questions: set.templates!.map((template, index) => instantiate(template, createRng(seed * 7919 + index)) ?? set.original.questions[index]) }
    : set.variants[variantIndex] ?? null;

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3 dark:border-slate-800">
        <div className="font-bold">{number}. {set.topic} <span className="ml-2 text-xs font-medium text-slate-500">{set.original.questions.length} {set.original.questions.length === 1 ? 'question' : 'questions'}</span></div>
        <div className="flex items-center gap-2 text-xs font-semibold">
          {templated ? (
            <>
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">Fresh numbers every test</span>
              <button onClick={() => setSeed((value) => value + 1)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-950/40"><RefreshCw className="size-3.5" /> New numbers</button>
            </>
          ) : (
            <>
              <span className={cn('rounded-full px-2.5 py-1', set.variants.length ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200')}>{set.variants.length} AI {set.variants.length === 1 ? 'version' : 'versions'} · {set.usedVariants.length} used</span>
              {set.variants.length > 1 && <button onClick={() => setVariantIndex((value) => (value + 1) % set.variants.length)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-950/40"><RefreshCw className="size-3.5" /> Next version</button>}
            </>
          )}
        </div>
      </div>
      <div className="grid divide-y divide-slate-200 lg:grid-cols-2 lg:divide-x lg:divide-y-0 dark:divide-slate-800">
        <ContentColumn title="Original (PDF)" content={set.original} />
        {sample ? <ContentColumn title={templated ? 'Sample with new numbers' : `Version ${variantIndex + 1}`} content={sample} /> : <div className="p-5 text-sm text-slate-500">No new versions yet. The original is used until you generate more.</div>}
      </div>
    </Card>
  );
}

function ContentColumn({ title, content }: { title: string; content: SetContent }) {
  return (
    <div className="space-y-4 p-5 text-sm leading-6">
      <div className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</div>
      {content.passage && <RichText text={content.passage} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50" />}
      {content.questions.map((question, index) => (
        <div key={index}>
          <RichText text={`${content.questions.length > 1 ? `Q${index + 1}. ` : ''}${question.text}`} className="font-medium" />
          <ol className="mt-2 space-y-1">
            {question.options.map((option, optionIndex) => (
              <li key={optionIndex} className={cn('flex gap-2 rounded-lg px-2 py-1', optionIndex === question.answerIndex && 'bg-emerald-50 font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200')}>
                <span className="w-4 shrink-0">{String.fromCharCode(65 + optionIndex)}.</span> {option} {optionIndex === question.answerIndex && <Check className="ml-auto size-4 shrink-0" />}
              </li>
            ))}
          </ol>
          {question.explanation && <RichText text={question.explanation} className="mt-2 text-xs text-slate-500 dark:text-slate-400" />}
        </div>
      ))}
    </div>
  );
}
