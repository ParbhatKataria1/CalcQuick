'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { Clock3, Grid3X3, Lock, X } from 'lucide-react';
import { ExamHeader, readCandidateName } from '@/components/exam/exam-header';
import { PaletteGrid, StatusLegend } from '@/components/exam/question-palette';
import { RichText } from '@/components/exam/rich-text';
import { SubmitSummary } from '@/components/exam/submit-summary';
import { mockApi } from '@/lib/mock-api';
import { formatClock, scoreAttempt } from '@/lib/mock-scoring';
import { cn } from '@/lib/utils';
import { sectionLabel, type MockAttempt, type MockTest, type QuestionResponse, type QuestionStatus } from '@/types/mock-test';

type Position = { section: number; question: number };

const AUTOSAVE_MS = 5000;
const WARN_BELOW_SECONDS = 60;
const subscribeNever = () => () => {};

const markVisited = (responses: QuestionResponse[][], { section, question }: Position) =>
  responses.map((items, sectionIndex) => items.map((response, index) =>
    sectionIndex === section && index === question && response.status === 'notVisited' ? { ...response, status: 'notAnswered' as QuestionStatus } : response));

export function ExamRunner({ test, attempt, initialPosition }: { test: MockTest; attempt: MockAttempt; initialPosition: Position }) {
  const router = useRouter();
  const candidate = useSyncExternalStore(subscribeNever, readCandidateName, () => 'Candidate');
  const sectional = test.timing === 'sectional';

  // With sectional timing only the attempt's current section is open; earlier ones are locked.
  const [openSection, setOpenSection] = useState(attempt.currentSection);
  const [position, setPosition] = useState<Position>(() =>
    sectional && initialPosition.section !== attempt.currentSection ? { section: attempt.currentSection, question: 0 } : initialPosition);
  const [responses, setResponses] = useState(() => markVisited(attempt.responses, position));
  const [draft, setDraft] = useState<number | null>(() => attempt.responses[position.section][position.question].selected);
  const [remaining, setRemaining] = useState(attempt.remainingSeconds);
  const clockIndex = sectional ? openSection : 0;
  const [deadline, setDeadline] = useState(() => Date.now() + attempt.remainingSeconds[clockIndex] * 1000);
  const [now, setNow] = useState(() => Date.now());
  const [confirming, setConfirming] = useState<'section' | 'test' | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const questionStartRef = useRef(0);
  const submittedRef = useRef(false);
  const latestRef = useRef({ responses, remaining, openSection, deadline, clockIndex, position });
  const timeUpRef = useRef<() => void>(() => {});

  const secondsLeft = Math.max(0, Math.ceil((deadline - now) / 1000));
  const isLastSection = !sectional || openSection === test.sections.length - 1;
  const section = test.sections[position.section];
  const question = section.questions[position.question];
  const sectionResponses = responses[position.section];

  useEffect(() => {
    questionStartRef.current = Date.now();
  }, []);

  useEffect(() => {
    latestRef.current = { responses, remaining, openSection, deadline, clockIndex, position };
  });

  const remainingNow = useCallback(() => {
    const { remaining: stored, deadline: end, clockIndex: index } = latestRef.current;
    return stored.map((value, itemIndex) => (itemIndex === index ? Math.max(0, Math.ceil((end - Date.now()) / 1000)) : value));
  }, []);

  /** Leaves the current question (optionally saving it) and opens the target. */
  const move = (target: Position, commit?: Pick<QuestionResponse, 'status' | 'selected'>) => {
    const timestamp = Date.now();
    const spent = timestamp - questionStartRef.current;
    questionStartRef.current = timestamp;
    const sameQuestion = target.section === position.section && target.question === position.question;
    setResponses((previous) => {
      const next = previous.map((items) => [...items]);
      const current = next[position.section][position.question];
      next[position.section][position.question] = { ...current, ...commit, timeMs: current.timeMs + spent };
      return markVisited(next, target);
    });
    setPosition(target);
    setDraft(sameQuestion ? (commit ? commit.selected : draft) : responses[target.section][target.question].selected);
    setPaletteOpen(false);
  };

  const nextPosition = (): Position => {
    if (position.question + 1 < section.questions.length) return { section: position.section, question: position.question + 1 };
    // The last question wraps to the first, of the same section when timing is sectional.
    if (sectional) return { section: position.section, question: 0 };
    return { section: (position.section + 1) % test.sections.length, question: 0 };
  };

  const saveAndNext = () => move(nextPosition(), draft === null ? { status: 'notAnswered', selected: null } : { status: 'answered', selected: draft });
  const markAndNext = () => move(nextPosition(), draft === null ? { status: 'marked', selected: null } : { status: 'answeredMarked', selected: draft });
  const clearResponse = () => {
    setDraft(null);
    setResponses((previous) => previous.map((items, sectionIndex) => items.map((response, index) =>
      sectionIndex === position.section && index === position.question
        ? { ...response, selected: null, status: response.status === 'answeredMarked' || response.status === 'marked' ? 'marked' : 'notAnswered' }
        : response)));
  };

  const submitTest = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    setConfirming(null);
    const { responses: latest, position: at } = latestRef.current;
    const spent = Date.now() - questionStartRef.current;
    const finalResponses = latest.map((items, sectionIndex) => items.map((response, index) =>
      sectionIndex === at.section && index === at.question ? { ...response, timeMs: response.timeMs + spent } : response));
    try {
      await mockApi.updateAttempt(attempt.id, { responses: finalResponses, remainingSeconds: remainingNow(), endedAt: Date.now(), ...scoreAttempt(test, finalResponses) });
      router.replace(`/mock-tests/result/${attempt.id}`);
    } catch (caught) {
      submittedRef.current = false;
      setSubmitting(false);
      setError(`Could not submit: ${caught instanceof Error ? caught.message : String(caught)} Your answers are kept; try again.`);
    }
  }, [attempt.id, remainingNow, router, test]);

  /** Locks the open section and starts the next one's clock (sectional timing only). */
  const startNextSection = () => {
    const nextSection = openSection + 1;
    const stored = remainingNow();
    stored[openSection] = 0;
    setRemaining(stored);
    setOpenSection(nextSection);
    setDeadline(Date.now() + stored[nextSection] * 1000);
    setConfirming(null);
    move({ section: nextSection, question: 0 });
  };

  useEffect(() => {
    timeUpRef.current = () => {
      if (submittedRef.current) return;
      if (sectional && openSection < test.sections.length - 1) startNextSection();
      else void submitTest();
    };
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= latestRef.current.deadline) timeUpRef.current();
    }, 500);
    return () => window.clearInterval(timer);
  }, []);

  // Autosave, so a reload or a closed tab resumes with the same answers and time.
  useEffect(() => {
    let lastSaved = '';
    const save = () => {
      if (submittedRef.current) return;
      const { responses: latest, openSection: current } = latestRef.current;
      const snapshot = { responses: latest, remainingSeconds: remainingNow(), currentSection: current };
      const serialized = JSON.stringify(snapshot);
      if (serialized === lastSaved) return;
      lastSaved = serialized;
      mockApi.updateAttempt(attempt.id, snapshot).catch(() => { lastSaved = ''; });
    };
    const timer = window.setInterval(save, AUTOSAVE_MS);
    const onHide = () => { if (document.visibilityState === 'hidden') save(); };
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [attempt.id, remainingNow]);

  // Keep the open question in the URL, so a reload lands on it.
  useEffect(() => {
    window.history.replaceState(null, '', `?s=${position.section + 1}&q=${position.question + 1}`);
  }, [position]);

  useEffect(() => {
    if (submitting) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [submitting]);

  const switchSection = (index: number) => {
    if (index === position.section || (sectional && index !== openSection)) return;
    move({ section: index, question: 0 });
  };

  const summaryResponses = confirming === 'section' ? [responses[openSection]] : responses;
  const summarySections = confirming === 'section' ? [test.sections[openSection]] : test.sections;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white text-[#222]">
      <ExamHeader
        title={test.name}
        candidate={candidate}
        timer={
          <div className={cn('flex items-center gap-2 rounded px-3 py-1.5 text-sm', secondsLeft <= WARN_BELOW_SECONDS ? 'bg-[#c0392b]' : 'bg-white/15')}>
            <Clock3 className="size-4" /> <span className="hidden sm:inline">Time Left:</span> <b className="tabular-nums">{formatClock(secondsLeft)}</b>
          </div>
        }
      />

      <div className="flex items-center gap-1 overflow-x-auto border-b border-[#c9d6e8] bg-[#e8f0fa] px-2 py-1.5">
        {test.sections.map((item, index) => {
          const locked = sectional && index !== openSection;
          return (
            <button key={item.section} type="button" disabled={locked} onClick={() => switchSection(index)} className={cn('inline-flex shrink-0 items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold sm:text-sm', index === position.section ? 'bg-[#2f6fb3] text-white' : 'bg-white text-[#1f4e8c] ring-1 ring-[#c9d6e8]', locked && 'cursor-not-allowed opacity-60')}>
              {locked && <Lock className="size-3" />} {sectionLabel[item.section]}
            </button>
          );
        })}
        <button type="button" onClick={() => setPaletteOpen(true)} className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded bg-white px-3 py-1.5 text-xs font-semibold text-[#1f4e8c] ring-1 ring-[#c9d6e8] lg:hidden"><Grid3X3 className="size-3.5" /> Palette</button>
      </div>

      {error && <div className="border-b border-[#f1c0b8] bg-[#fdecea] px-4 py-2 text-sm text-[#c0392b]">{error}</div>}

      <div className="flex min-h-0 flex-1">
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-[#dde3ea] px-4 py-2">
            <div className="text-sm font-bold">Question No. {position.question + 1}</div>
            <div className="text-xs text-[#555]">View in: <span className="rounded border border-[#b9bec7] px-2 py-0.5">English</span></div>
          </div>

          <div className={cn('min-h-0 flex-1', question.passage ? 'grid overflow-auto md:grid-cols-2 md:overflow-hidden' : 'overflow-auto')}>
            {question.passage && (
              <div className="border-b border-[#dde3ea] p-4 text-sm leading-6 md:overflow-auto md:border-b-0 md:border-r">
                <RichText text={question.passage} />
              </div>
            )}
            <div className="p-4 md:overflow-auto">
              <RichText text={question.text} className="text-[15px] leading-7" />
              <div className="mt-5 space-y-2.5">
                {question.options.map((option, index) => (
                  <label key={index} className={cn('flex cursor-pointer items-start gap-3 rounded px-2 py-1.5 text-[15px] hover:bg-[#f2f6fb]', draft === index && 'bg-[#e8f0fa]')}>
                    <input type="radio" name={`q-${position.section}-${position.question}`} checked={draft === index} onChange={() => setDraft(index)} className="mt-1.5 size-4 accent-[#2f6fb3]" />
                    <RichText text={option} />
                  </label>
                ))}
              </div>
            </div>
          </div>

          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[#c9d6e8] bg-[#f5f7fa] px-3 py-2.5">
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={markAndNext} disabled={submitting} className="rounded border border-[#b9bec7] bg-white px-3 py-2 text-xs font-semibold sm:text-sm">Mark for Review &amp; Next</button>
              <button type="button" onClick={clearResponse} disabled={submitting} className="rounded border border-[#b9bec7] bg-white px-3 py-2 text-xs font-semibold sm:text-sm">Clear Response</button>
            </div>
            <button type="button" onClick={saveAndNext} disabled={submitting} className="rounded bg-[#2f6fb3] px-5 py-2 text-xs font-bold text-white sm:text-sm">Save &amp; Next</button>
          </footer>
        </main>

        {paletteOpen && <button type="button" aria-label="Close palette" onClick={() => setPaletteOpen(false)} className="fixed inset-0 z-10 bg-black/30 lg:hidden" />}
        <aside className={cn('w-72 shrink-0 flex-col border-l border-[#c9d6e8] bg-[#f5f8fc] lg:flex', paletteOpen ? 'fixed inset-y-0 right-0 z-20 flex shadow-2xl' : 'hidden')}>
          <div className="flex items-center justify-between border-b border-[#dde3ea] px-4 py-3">
            <div className="text-xs leading-4"><div className="text-[#666]">Candidate</div><div className="font-semibold">{candidate}</div></div>
            <button type="button" onClick={() => setPaletteOpen(false)} aria-label="Close palette" className="rounded p-1 text-[#666] lg:hidden"><X className="size-5" /></button>
          </div>
          <div className="border-b border-[#dde3ea] p-4"><StatusLegend responses={sectionResponses} /></div>
          <div className="bg-[#2f6fb3] px-4 py-1.5 text-xs font-semibold text-white">You are viewing {sectionLabel[section.section]}</div>
          <div className="px-4 pt-3 text-xs font-bold">Question Palette:</div>
          <div className="min-h-0 flex-1 overflow-auto p-4">
            <PaletteGrid responses={sectionResponses} current={position.question} onSelect={(index) => move({ section: position.section, question: index })} disabled={submitting} />
          </div>
          <div className="border-t border-[#dde3ea] p-3">
            <button type="button" disabled={submitting} onClick={() => setConfirming(isLastSection ? 'test' : 'section')} className="w-full rounded bg-[#1f8f4e] py-2.5 text-sm font-bold text-white disabled:opacity-60">
              {submitting ? 'Submitting…' : isLastSection ? 'Submit' : 'Submit Section'}
            </button>
          </div>
        </aside>
      </div>

      {confirming && (
        <SubmitSummary
          title={confirming === 'section' ? `Submit ${sectionLabel[test.sections[openSection].section]}?` : 'Submit the test?'}
          note={confirming === 'section' ? 'This section will be locked and the next one starts now. You cannot return to it.' : 'You will not be able to change your answers after submitting.'}
          sections={summarySections}
          responses={summaryResponses}
          onCancel={() => setConfirming(null)}
          onConfirm={() => (confirming === 'section' ? startNextSection() : void submitTest())}
        />
      )}
    </div>
  );
}
