'use client';

import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft, CheckCircle2, Eye, Loader2, Pencil, Play, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { mockApi } from '@/lib/mock-api';
import { isTemplated, paperPattern, setsNeedingVersions } from '@/lib/mock-generator';
import { useLoad } from '@/lib/use-load';
import { cn } from '@/lib/utils';
import { sectionLabel, type MockSource, type MockTest, type Section } from '@/types/mock-test';

/** Prelims pattern shared by IBPS and SBI PO & Clerk: English 30, Quant 35, Reasoning 35, 20 minutes each. */
const PRELIMS_QUESTIONS: Record<Section, number> = { english: 30, quant: 35, reasoning: 35 };
const PRELIMS_MINUTES = 20;
/** Prelims pace: 20 minutes for 35 questions is about 34 seconds each. */
const SECONDS_PER_QUESTION = 34;

const defaultMinutes = (section: Section, questions: number) =>
  questions === PRELIMS_QUESTIONS[section] ? PRELIMS_MINUTES : Math.max(1, Math.round((questions * SECONDS_PER_QUESTION) / 60));

export default function MockSourcePage({ params }: { params: Promise<{ sourceId: string }> }) {
  const { sourceId } = use(params);
  const { data: source, error, loading, reload } = useLoad(() => mockApi.getSource(sourceId), sourceId);

  if (loading && !source) return <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="size-4 animate-spin" /> Loading paper…</div>;
  if (!source) {
    return (
      <Card className="mx-auto max-w-xl p-8 text-center">
        <h1 className="text-xl font-bold">Paper not available</h1>
        <p className="mt-2 text-sm text-slate-500">{error}</p>
        <Link href="/mock-tests" className="mt-5 inline-block"><Button variant="outline"><ArrowLeft className="size-4" /> All papers</Button></Link>
      </Card>
    );
  }
  if (source.importState?.status === 'reading') return <ReadingPaper source={source} onDone={reload} />;
  return <SourceSetup source={source} onChanged={reload} />;
}

/**
 * Reads a freshly uploaded paper one part per request (outline, then chunks of questions) and shows
 * progress. Each part is saved as it finishes, so stopping, an error or closing the tab loses nothing.
 */
function ReadingPaper({ source, onDone }: { source: MockSource; onDone: () => void }) {
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const stopRef = useRef(false);
  const startedRef = useRef(false);

  const read = useCallback(async () => {
    stopRef.current = false;
    setRunning(true);
    setError(null);
    try {
      for (;;) {
        const step = await mockApi.importStep(source.id);
        setProgress({ done: step.done, total: step.total });
        if (step.status === 'ready') {
          onDone();
          return;
        }
        if (stopRef.current) break;
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setRunning(false);
    }
  }, [onDone, source.id]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void read();
  }, [read]);

  const label = !progress || progress.total <= 1
    ? 'Finding the questions in the paper…'
    : `Reading questions… ${Math.max(0, progress.done - 1)} of ${progress.total - 1} parts done`;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/mock-tests" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400"><ArrowLeft className="size-4" /> All papers</Link>
      <Card className="p-6">
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-300">Reading the paper</div>
        <h1 className="mt-2 text-2xl font-bold">{source.name}</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Gemini reads the paper in parts of about 15 questions, so even long papers fit. Each part is saved as soon as it&apos;s done: you can stop, close this page or come back later.</p>
        <div className="mt-5 flex items-center gap-2 text-sm font-semibold">{running && <Loader2 className="size-4 animate-spin text-indigo-600" />} {label}</div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${progress ? (progress.done / progress.total) * 100 : 5}%` }} /></div>
        {error && <div className="mt-4 flex items-start gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"><AlertTriangle className="mt-0.5 size-4 shrink-0" /> {error}</div>}
        <div className="mt-5 flex gap-2">
          {running
            ? <Button variant="outline" onClick={() => { stopRef.current = true; }}>Stop after this part</Button>
            : <Button onClick={() => void read()}><Play className="size-4 fill-current" /> {error ? 'Try again' : 'Continue reading'}</Button>}
        </div>
      </Card>
    </div>
  );
}

type Progress = { done: number; total: number; added: number; rejected: number; failed: string[] };

function SourceSetup({ source, onChanged }: { source: MockSource; onChanged: () => void }) {
  const router = useRouter();
  const pattern = useMemo(() => paperPattern(source), [source]);
  const [minutes, setMinutes] = useState<Partial<Record<Section, number>>>(() => Object.fromEntries(pattern.map(({ section, questions }) => [section, defaultMinutes(section, questions)])));
  const [timing, setTiming] = useState<MockTest['timing']>('sectional');
  const [starting, setStarting] = useState(false);
  const [writing, setWriting] = useState<Progress | null>(null);
  const [moreFor, setMoreFor] = useState<Section | null>(null);
  const [message, setMessage] = useState<{ tone: 'error' | 'info'; text: string } | null>(null);
  const stopRef = useRef(false);
  const autoStartedRef = useRef(false);

  const needing = setsNeedingVersions(source);
  const totalQuestions = pattern.reduce((sum, item) => sum + item.questions, 0);
  const totalMinutes = pattern.reduce((sum, item) => sum + (minutes[item.section] ?? 0), 0);

  /** Writes and reviews versions a few sets per request until every set has a fresh one. */
  const writeVersions = useCallback(async () => {
    stopRef.current = false;
    const total = setsNeedingVersions(source).length;
    let progress: Progress = { done: 0, total, added: 0, rejected: 0, failed: [] };
    setWriting(progress);
    setMessage(null);
    try {
      for (;;) {
        const result = await mockApi.generateVariants(source.id, { skip: progress.failed });
        progress = {
          done: total - result.remaining,
          total,
          added: progress.added + result.added,
          rejected: progress.rejected + result.rejected.length,
          failed: [...progress.failed, ...result.failedSetIds],
        };
        setWriting(progress);
        if (!result.remaining || stopRef.current) break;
      }
      setMessage({
        tone: progress.failed.length ? 'error' : 'info',
        text: `${progress.added} checked ${progress.added === 1 ? 'version' : 'versions'} added; ${progress.rejected} rejected for a wrong answer key, an easier level or a different length.${progress.failed.length ? ` ${progress.failed.length} ${progress.failed.length === 1 ? 'set' : 'sets'} got none — try again later.` : ''}`,
      });
    } catch (caught) {
      setMessage({ tone: 'error', text: `${caught instanceof Error ? caught.message : String(caught)} Versions written so far are saved.` });
    } finally {
      setWriting(null);
      onChanged();
    }
  }, [onChanged, source]);

  // A freshly uploaded paper has no versions yet, so start writing them straight away.
  useEffect(() => {
    if (autoStartedRef.current || !needing.length) return;
    autoStartedRef.current = true;
    void writeVersions();
  }, [needing.length, writeVersions]);

  const generateMore = async (section: Section) => {
    setMoreFor(section);
    setMessage(null);
    try {
      const { added, rejected } = await mockApi.generateVariants(source.id, { section });
      setMessage({ tone: 'info', text: `Added ${added} checked ${added === 1 ? 'version' : 'versions'} to ${sectionLabel[section]}${rejected.length ? `; ${rejected.length} rejected` : ''}.` });
      onChanged();
    } catch (caught) {
      setMessage({ tone: 'error', text: caught instanceof Error ? caught.message : String(caught) });
    } finally {
      setMoreFor(null);
    }
  };

  const start = async () => {
    setStarting(true);
    setMessage(null);
    try {
      const { id } = await mockApi.createTest(source.id, timing, minutes);
      router.push(`/mock-tests/test/${id}/instructions`);
    } catch (caught) {
      setMessage({ tone: 'error', text: caught instanceof Error ? caught.message : String(caught) });
      setStarting(false);
    }
  };

  const rename = async () => {
    const name = window.prompt('Paper name', source.name)?.trim();
    if (!name || name === source.name) return;
    await mockApi.renameSource(source.id, name);
    onChanged();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href="/mock-tests" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400"><ArrowLeft className="size-4" /> All papers</Link>
      <div className="rounded-3xl bg-slate-950 p-7 text-white md:p-10">
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-300">Generate a mock test</div>
        <div className="mt-3 flex items-start gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{source.name}</h1>
          <button onClick={rename} aria-label="Rename paper" className="mt-1.5 rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"><Pencil className="size-4" /></button>
        </div>
        <p className="mt-3 max-w-2xl leading-7 text-slate-300">Every test follows this paper exactly: the same topics, question counts and order. Calculation questions get fresh numbers of the same size and difficulty; the rest use AI versions that passed a length check and an independent review of their answers and level.</p>
        <Link href={`/mock-tests/${source.id}/review`} className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10"><Eye className="size-4" /> Review questions and versions</Link>
      </div>

      {writing && (
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-semibold"><Loader2 className="size-4 animate-spin text-indigo-600" /> Writing and checking new versions… {writing.done}/{writing.total} sets</div>
            <Button variant="outline" size="sm" onClick={() => { stopRef.current = true; }}>Stop after this batch</Button>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${writing.total ? (writing.done / writing.total) * 100 : 0}%` }} /></div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{writing.added} accepted · {writing.rejected} rejected so far. Each batch takes about a minute; you can start a test meanwhile, but sets without a version yet will repeat earlier ones.</p>
        </Card>
      )}

      {Boolean(source.importState?.skipped?.length) && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div>Some questions couldn&apos;t be read and are left out of this paper: {source.importState!.skipped!.join('; ')}.</div>
        </div>
      )}

      {message && (
        <div className={cn('flex items-start gap-2 rounded-xl px-4 py-3 text-sm', message.tone === 'error' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' : 'bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200')}>
          {message.tone === 'error' ? <AlertTriangle className="mt-0.5 size-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0" />} {message.text}
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 p-5 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-bold">Paper pattern</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{totalQuestions} questions · {totalMinutes} minutes · +1 / −0.25. Topics are listed in paper order.</p>
          </div>
          {!writing && needing.length > 0 && <Button variant="outline" size="sm" onClick={() => void writeVersions()}><Sparkles className="size-4" /> Write versions for {needing.length} {needing.length === 1 ? 'set' : 'sets'}</Button>}
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {pattern.map(({ section, sets, topics, questions }) => {
            const templated = sets.filter(isTemplated).reduce((sum, set) => sum + set.original.questions.length, 0);
            const stale = sets.filter((set) => !isTemplated(set) && set.variants.length <= set.usedVariants.length);
            const staleQuestions = stale.reduce((sum, set) => sum + set.original.questions.length, 0);
            return (
              <div key={section} className="grid gap-4 p-5 md:grid-cols-[1fr_auto]">
                <div>
                  <div className="font-bold">{sectionLabel[section]} <span className="font-medium text-slate-400">· {questions} {questions === 1 ? 'question' : 'questions'}</span></div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {topics.map((item, index) => <span key={`${item.topic}-${index}`} className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{item.topic} × {item.questions}</span>)}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    {templated > 0 && <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300"><ShieldCheck className="size-3.5" /> {templated} with fresh numbers of the same difficulty</span>}
                    {questions - templated > 0 && (staleQuestions
                      ? <span className="text-amber-700 dark:text-amber-300">{staleQuestions} would repeat an earlier version</span>
                      : <span className="text-slate-500">{questions - templated} from unseen checked versions</span>)}
                  </div>
                  {questions - templated > 0 && (
                    <button type="button" disabled={Boolean(writing) || moreFor !== null} onClick={() => generateMore(section)} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 disabled:opacity-50 dark:text-indigo-300">
                      {moreFor === section ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />} More versions for this section
                    </button>
                  )}
                </div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Minutes
                  <input type="number" min={1} max={240} value={minutes[section] ?? ''} onChange={(event) => setMinutes((current) => ({ ...current, [section]: Math.min(240, Math.max(1, Number(event.target.value) || 1)) }))} className="mt-1 block h-10 w-24 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
                </label>
              </div>
            );
          })}
        </div>
        <div className="space-y-5 border-t border-slate-100 p-5 dark:border-slate-800">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Timing</div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <TimingOption active={timing === 'sectional'} onClick={() => setTiming('sectional')} title="Sectional (as in prelims)" detail="Each section has its own clock and locks when time runs out." />
              <TimingOption active={timing === 'composite'} onClick={() => setTiming('composite')} title="Composite" detail={`One ${totalMinutes}-minute clock; move between sections freely.`} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button size="lg" disabled={starting} onClick={start}>{starting ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4 fill-current" />} Generate &amp; start</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function TimingOption({ active, onClick, title, detail }: { active: boolean; onClick: () => void; title: string; detail: string }) {
  return (
    <button type="button" onClick={onClick} className={cn('rounded-xl border p-3 text-left', active ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40' : 'border-slate-200 dark:border-slate-800')}>
      <div className={cn('text-sm font-semibold', active && 'text-indigo-700 dark:text-indigo-300')}>{title}</div>
      <div className="mt-0.5 text-xs text-slate-500">{detail}</div>
    </button>
  );
}
