'use client';

import { use, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Eye, Loader2, Pencil, Play, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { mockApi, requestVariants } from '@/lib/mock-api';
import { buildMockTest, isTemplated, sectionCounts, type SectionPlan } from '@/lib/mock-generator';
import { useLoad } from '@/lib/use-load';
import { cn } from '@/lib/utils';
import { SECTIONS, sectionLabel, type MockSource, type MockTest, type Section } from '@/types/mock-test';

type Plan = Record<Section, { enabled: boolean; questions: number; minutes: number }>;

/** Prelims pattern shared by IBPS and SBI PO & Clerk: English 30, Quant 35, Reasoning 35, 20 minutes each. */
const PRELIMS: Record<Section, { questions: number; minutes: number }> = {
  english: { questions: 30, minutes: 20 },
  quant: { questions: 35, minutes: 20 },
  reasoning: { questions: 35, minutes: 20 },
};

/** Sets for one "Generate more" call; the route accepts up to 40. */
const VARIANT_REQUEST_SETS = 20;

export default function MockSourcePage({ params }: { params: Promise<{ sourceId: string }> }) {
  const { sourceId } = use(params);
  const { data: source, error, loading, reload } = useLoad(() => mockApi.getSource(sourceId), sourceId);
  const warning = useSearchParams().get('warning');

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
  return <SourceSetup source={source} warning={warning} onChanged={reload} />;
}

function SourceSetup({ source, warning, onChanged }: { source: MockSource; warning: string | null; onChanged: () => void }) {
  const router = useRouter();
  const counts = useMemo(() => sectionCounts(source), [source]);
  const presetFor = (pattern: 'prelims' | 'full'): Plan => Object.fromEntries(SECTIONS.map((section) => {
    const available = counts[section].questions;
    const questions = pattern === 'prelims' ? Math.min(PRELIMS[section].questions, available) : available;
    // About 34 seconds a question, the prelims pace, rounded to whole minutes.
    const minutes = pattern === 'prelims' && questions === PRELIMS[section].questions ? PRELIMS[section].minutes : Math.max(1, Math.round((questions * 34) / 60));
    return [section, { enabled: available > 0, questions, minutes }];
  })) as Plan;

  const [plan, setPlan] = useState<Plan>(() => presetFor('prelims'));
  const [timing, setTiming] = useState<MockTest['timing']>('sectional');
  const [starting, setStarting] = useState(false);
  const [generating, setGenerating] = useState<Section | null>(null);
  const [message, setMessage] = useState<{ tone: 'error' | 'info'; text: string } | null>(warning ? { tone: 'info', text: warning } : null);

  const chosen = SECTIONS.filter((section) => plan[section].enabled && plan[section].questions > 0);
  const totalQuestions = chosen.reduce((sum, section) => sum + plan[section].questions, 0);
  const totalMinutes = chosen.reduce((sum, section) => sum + plan[section].minutes, 0);

  const update = (section: Section, patch: Partial<Plan[Section]>) => setPlan((current) => ({ ...current, [section]: { ...current[section], ...patch } }));

  const start = async () => {
    setStarting(true);
    setMessage(null);
    try {
      const sections: SectionPlan[] = chosen.map((section) => ({ section, questions: plan[section].questions, durationSeconds: plan[section].minutes * 60 }));
      const testNumber = (await mockApi.listAttempts(source.id)).length + 1;
      const { test, usedVariants } = buildMockTest(source, { name: `${source.name} · Test ${testNumber}`, timing, sections });
      await mockApi.createTest(test);
      if (Object.keys(usedVariants).length) {
        const sets = source.sets.map((set) => (set.id in usedVariants ? { ...set, usedVariants: [...new Set([...set.usedVariants, usedVariants[set.id]])] } : set));
        await mockApi.updateSource(source.id, { sets });
      }
      router.push(`/mock-tests/test/${test.id}/instructions`);
    } catch (caught) {
      setMessage({ tone: 'error', text: caught instanceof Error ? caught.message : String(caught) });
      setStarting(false);
    }
  };

  const generateMore = async (section: Section) => {
    setGenerating(section);
    setMessage(null);
    try {
      // Sets with the fewest unseen versions first.
      const targets = source.sets
        .filter((set) => set.section === section && !isTemplated(set))
        .sort((a, b) => (a.variants.length - a.usedVariants.length) - (b.variants.length - b.usedVariants.length))
        .slice(0, VARIANT_REQUEST_SETS);
      const variants = await requestVariants(targets);
      const added = Object.values(variants).reduce((sum, items) => sum + items.length, 0);
      const sets = source.sets.map((set) => (variants[set.id]?.length ? { ...set, variants: [...set.variants, ...variants[set.id]] } : set));
      await mockApi.updateSource(source.id, { sets });
      setMessage({ tone: 'info', text: `Added ${added} new ${added === 1 ? 'version' : 'versions'} to ${sectionLabel[section]}.` });
      onChanged();
    } catch (caught) {
      setMessage({ tone: 'error', text: caught instanceof Error ? caught.message : String(caught) });
    } finally {
      setGenerating(null);
    }
  };

  const rename = async () => {
    const name = window.prompt('Paper name', source.name)?.trim();
    if (!name || name === source.name) return;
    await mockApi.updateSource(source.id, { name });
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
        <p className="mt-3 max-w-2xl leading-7 text-slate-300">Quant questions get fresh numbers every time. Reasoning and English use AI-written versions, unseen ones first.</p>
        <Link href={`/mock-tests/${source.id}/review`} className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10"><Eye className="size-4" /> Review questions and versions</Link>
      </div>

      {message && (
        <div className={cn('flex items-start gap-2 rounded-xl px-4 py-3 text-sm', message.tone === 'error' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' : 'bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200')}>
          <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {message.text}
        </div>
      )}

      <section className="grid gap-3 md:grid-cols-3">
        {SECTIONS.map((section) => {
          const count = counts[section];
          const staticQuestions = count.questions - count.templated;
          return (
            <Card key={section} className="p-5">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{sectionLabel[section]}</div>
              <div className="mt-2 text-2xl font-bold">{count.questions} <span className="text-sm font-medium text-slate-400">questions in paper</span></div>
              <ul className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                {count.templated > 0 && <li>{count.templated} with endless fresh numbers</li>}
                {staticQuestions > 0 && <li>{staticQuestions} in {count.sets - count.templatedSets} {count.sets - count.templatedSets === 1 ? 'set' : 'sets'} · <span className={cn('font-semibold', count.unseen === 0 && 'text-amber-600')}>{count.unseen} unseen {count.unseen === 1 ? 'version' : 'versions'}</span></li>}
              </ul>
              {staticQuestions > 0 && (
                <Button variant="outline" size="sm" className="mt-4" disabled={generating !== null} onClick={() => generateMore(section)}>
                  {generating === section ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} {generating === section ? 'Writing…' : 'Generate more with AI'}
                </Button>
              )}
            </Card>
          );
        })}
      </section>

      <Card className="p-5 md:p-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Test pattern</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Puzzles and passages stay whole, so a section can come out a few questions short.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPlan(presetFor('prelims'))}>IBPS / SBI Prelims</Button>
            <Button variant="outline" size="sm" onClick={() => setPlan(presetFor('full'))}>Whole paper</Button>
          </div>
        </div>

        <div className="mt-5 divide-y divide-slate-100 rounded-2xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {SECTIONS.map((section) => {
            const available = counts[section].questions;
            return (
              <div key={section} className={cn('grid items-center gap-4 p-4 sm:grid-cols-[1fr_auto_auto]', !available && 'opacity-50')}>
                <label className="flex items-center gap-3 font-semibold">
                  <input type="checkbox" className="size-4 accent-indigo-600" disabled={!available} checked={plan[section].enabled} onChange={(event) => update(section, { enabled: event.target.checked })} />
                  {sectionLabel[section]}
                </label>
                <NumberField label={`Questions (max ${available})`} value={plan[section].questions} min={1} max={Math.max(1, available)} disabled={!plan[section].enabled} onChange={(questions) => update(section, { questions })} />
                <NumberField label="Minutes" value={plan[section].minutes} min={1} max={180} disabled={!plan[section].enabled} onChange={(minutes) => update(section, { minutes })} />
              </div>
            );
          })}
        </div>

        <div className="mt-5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Timing</div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <TimingOption active={timing === 'sectional'} onClick={() => setTiming('sectional')} title="Sectional (as in prelims)" detail="Each section has its own clock and locks when time runs out." />
            <TimingOption active={timing === 'composite'} onClick={() => setTiming('composite')} title="Composite" detail={`One ${totalMinutes}-minute clock; move between sections freely.`} />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-500 dark:text-slate-400">{totalQuestions} questions · {totalMinutes} minutes · +1 / −0.25</div>
          <Button size="lg" disabled={!chosen.length || starting} onClick={start}>{starting ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4 fill-current" />} Generate &amp; start</Button>
        </div>
      </Card>
    </div>
  );
}

function NumberField({ label, value, min, max, disabled, onChange }: { label: string; value: number; min: number; max: number; disabled?: boolean; onChange: (value: number) => void }) {
  return (
    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
      {label}
      <input type="number" value={value} min={min} max={max} disabled={disabled} onChange={(event) => onChange(Math.min(max, Math.max(min, Number(event.target.value) || min)))} className="mt-1 block h-10 w-28 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
    </label>
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
