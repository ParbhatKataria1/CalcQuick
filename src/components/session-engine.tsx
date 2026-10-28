'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Clock3, Flame, Pause, Play, Target, Trophy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useStats } from '@/context/stats-context';
import { generateQuestion, getAdaptiveDifficulty, isAnswerCorrect } from '@/lib/question-generator';
import { categoryLabel } from '@/constants/categories';
import { getWeakCategories, sessionToXp } from '@/lib/stats';
import { getDueReviews, recordToQuestion } from '@/lib/review';
import { checkPairs, pairKey } from '@/lib/factor-pairs';
import type { AnswerRecord, Difficulty, Question, SessionConfig, SessionRecord } from '@/types';
import { cn } from '@/lib/utils';

type Props = {
  config: SessionConfig;
  /** Where Exit leads: the setup screen the session was started from. */
  exitHref: string;
  /** The result page for a finished session; the engine navigates there once the session is saved. */
  resultHref: (sessionId: string) => string;
  initialQuestions?: Question[];
  /** Bring a wrong — or, for recall drills, slow — answer back later in the same session (once). */
  repeatMistakes?: boolean;
  /** Mix in past mistakes that are due for spaced review. */
  reviewDue?: boolean;
};

function formatTimer(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function playTone(correct: boolean) {
  if (typeof window === 'undefined') return;
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;
  const audio = new AudioContextClass();
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = correct ? 620 : 210;
  gain.gain.value = 0.035;
  oscillator.connect(gain);
  gain.connect(audio.destination);
  oscillator.start();
  oscillator.stop(audio.currentTime + 0.07);
  oscillator.addEventListener('ended', () => audio.close());
}

const REPEAT_GAP = 3;
const REPEAT_PREFIX = 'repeat-';
/** Share of a session that review questions may take, and the cap for endless or timed sessions. */
const REVIEW_SHARE = 0.25;
const ENDLESS_REVIEW_LIMIT = 5;

export function SessionEngine({ config, exitHref, resultHref, initialQuestions, repeatMistakes = false, reviewDue = false }: Props) {
  const router = useRouter();
  const { stats, recordSession } = useStats();
  const [difficulty, setDifficulty] = useState<Difficulty>(config.difficulty);
  const [question, setQuestion] = useState<Question>(() => initialQuestions?.[0] ?? generateQuestion(config.category, config.difficulty));
  const [answer, setAnswer] = useState('');
  const [pairRows, setPairRows] = useState<string[][]>([]);
  const [pairResult, setPairResult] = useState<ReturnType<typeof checkPairs> | null>(null);
  const [awaitingNext, setAwaitingNext] = useState(false);
  const pendingAdvanceRef = useRef<(() => void) | null>(null);
  const [records, setRecords] = useState<AnswerRecord[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [paused, setPaused] = useState(false);
  const [finished, setFinished] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'slow' | 'incorrect' | null>(null);
  const [earnedXp, setEarnedXp] = useState(0);
  const [remaining, setRemaining] = useState(config.durationSeconds ?? 0);
  const [questionElapsed, setQuestionElapsed] = useState(0);
  const [questionQueue, setQuestionQueue] = useState<Question[]>(initialQuestions?.slice(1) ?? []);
  const [repeatCount, setRepeatCount] = useState(0);
  const [reviewPool, setReviewPool] = useState<Question[]>(() => {
    if (!reviewDue) return [];
    // Keep reviews on topic: match the categories the session already asks about.
    const categories = initialQuestions?.length ? new Set(initialQuestions.map((item) => item.category)) : null;
    const prompts = new Set(initialQuestions?.map((item) => item.prompt));
    const limit = config.questionCount === 'endless' ? ENDLESS_REVIEW_LIMIT : Math.max(1, Math.floor(config.questionCount * REVIEW_SHARE));
    return getDueReviews(stats.answers)
      .filter(({ record }) => (categories ? categories.has(record.category) : config.category === 'mixed' || record.category === config.category) && !prompts.has(record.prompt))
      .slice(0, limit)
      .map(({ record }) => recordToQuestion(record, 'review', 'Review — missed in an earlier session'));
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const sessionStartRef = useRef(Date.now());
  const questionStartRef = useRef(Date.now());
  const accumulatedQuestionMsRef = useRef(0);
  const finalizedRef = useRef(false);
  const finishRequestedRef = useRef(false);

  const isSpeed = Boolean(config.durationSeconds);
  const baseTarget = config.questionCount === 'endless' ? null : config.questionCount;
  const targetCount = baseTarget === null ? null : baseTarget + repeatCount;
  const weakCategories = useMemo(() => getWeakCategories(stats), [stats]);
  const weightedWeak = useMemo(() => weakCategories.flatMap((category) => [category, category, category]), [weakCategories]);

  const completed = records.length;
  const correct = records.filter((record) => record.correct).length;
  const progress = targetCount ? Math.min(100, (completed / targetCount) * 100) : 0;

  const getNextQuestion = useCallback((nextDifficulty: Difficulty, queue: Question[], remainingSlots: number | null) => {
    // Spread due reviews across the session rather than front-loading them.
    if (reviewPool.length && Math.random() < (remainingSlots === null ? REVIEW_SHARE : reviewPool.length / remainingSlots)) {
      const [review, ...rest] = reviewPool;
      setReviewPool(rest);
      return review;
    }
    if (queue.length) {
      const [next, ...rest] = queue;
      setQuestionQueue(rest);
      return next;
    }
    const weighted = config.mode === 'weak' && weightedWeak.length ? weightedWeak : undefined;
    return generateQuestion(config.category, nextDifficulty, weighted);
  }, [config.category, config.mode, reviewPool, weightedWeak]);

  const resetQuestionClock = useCallback(() => {
    accumulatedQuestionMsRef.current = 0;
    questionStartRef.current = Date.now();
    setQuestionElapsed(0);
  }, []);

  const finishSession = useCallback(() => {
    if (finishRequestedRef.current) return;
    finishRequestedRef.current = true;
    setFinished(true);
    setPaused(false);
  }, []);

  useEffect(() => {
    if (finished || paused) return;
    const timer = window.setInterval(() => {
      setQuestionElapsed(accumulatedQuestionMsRef.current + Date.now() - questionStartRef.current);
    }, 100);
    return () => window.clearInterval(timer);
  }, [finished, paused, question.id]);

  useEffect(() => {
    if (!isSpeed || finished || paused) return;
    const interval = window.setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) {
          window.setTimeout(finishSession, 0);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [finishSession, finished, isSpeed, paused]);

  useEffect(() => {
    if (!paused && !finished) inputRef.current?.focus();
  }, [paused, finished, question.id]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !finished) {
        event.preventDefault();
        setPaused((value) => !value);
      }
      if (event.code === 'Space' && paused && !finished) {
        event.preventDefault();
        setPaused(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [finished, paused]);

  useEffect(() => {
    if (paused) {
      accumulatedQuestionMsRef.current += Date.now() - questionStartRef.current;
      setQuestionElapsed(accumulatedQuestionMsRef.current);
    } else if (!finished) {
      questionStartRef.current = Date.now();
    }
  }, [paused, finished]);

  useEffect(() => {
    if (!finished || finalizedRef.current) return;
    finalizedRef.current = true;
    const endedAt = Date.now();
    const total = records.length;
    const correctCount = records.filter((record) => record.correct).length;
    const avgMs = total ? records.reduce((sum, record) => sum + record.responseTimeMs, 0) / total : 0;
    const bestMs = total ? Math.min(...records.map((record) => record.responseTimeMs)) : 0;
    const baseSession = {
      id: `session-${endedAt}`,
      mode: config.mode,
      category: config.category,
      difficulty: config.difficulty,
      startedAt: sessionStartRef.current,
      endedAt,
      total,
      correct: correctCount,
      incorrect: total - correctCount,
      accuracy: total ? (correctCount / total) * 100 : 0,
      averageTimeMs: avgMs,
      bestTimeMs: bestMs,
      bestStreak,
    } satisfies Omit<SessionRecord, 'xpEarned'>;
    recordSession({ ...baseSession, xpEarned: sessionToXp(baseSession) }, records, config.durationSeconds);
    router.replace(resultHref(baseSession.id));
  }, [bestStreak, config, finished, recordSession, records, resultHref, router]);

  const submitAnswer = (event: React.FormEvent) => {
    event.preventDefault();
    if (pendingAdvanceRef.current) {
      const advance = pendingAdvanceRef.current;
      pendingAdvanceRef.current = null;
      setAwaitingNext(false);
      advance();
      return;
    }
    // Pair questions may be submitted blank to reveal every pair.
    if ((!question.pairs && !answer.trim()) || paused || finished || feedback) return;

    const responseTimeMs = accumulatedQuestionMsRef.current + Date.now() - questionStartRef.current;
    const pairCheck = question.pairs ? checkPairs(question.pairs, pairRows) : null;
    const correctAnswer = pairCheck ? pairCheck.correct : isAnswerCorrect(question, answer);
    const userAnswer = question.pairs
      ? pairRows.filter((row) => row.some((value) => value?.trim())).map(([a = '', b = '']) => `${a.trim() || '?'} × ${b.trim() || '?'}`).join(', ') || '—'
      : answer.trim();
    setPairResult(pairCheck);
    const nextStreak = correctAnswer ? currentStreak + 1 : 0;
    const nextRecord: AnswerRecord = {
      id: question.id,
      category: question.category,
      prompt: question.prompt,
      correctAnswer: question.answer,
      userAnswer,
      correct: correctAnswer,
      responseTimeMs,
      timestamp: Date.now(),
    };
    const nextRecords = [...records, nextRecord];
    setRecords(nextRecords);
    setCurrentStreak(nextStreak);
    setBestStreak((value) => Math.max(value, nextStreak));
    const slow = correctAnswer && question.slowAfterMs !== undefined && responseTimeMs > question.slowAfterMs;
    setFeedback(slow ? 'slow' : correctAnswer ? 'correct' : 'incorrect');
    if (stats.soundEnabled) playTone(correctAnswer);

    const immediateXp = correctAnswer ? 10 + (responseTimeMs < 3000 ? 5 : 0) + (nextStreak > 0 && nextStreak % 5 === 0 ? 10 : 0) : 0;
    setEarnedXp((value) => value + immediateXp);

    const shouldRepeat = repeatMistakes && (!correctAnswer || slow) && targetCount !== null && !question.id.startsWith(REPEAT_PREFIX);
    const nextQueue = shouldRepeat
      ? [...questionQueue.slice(0, REPEAT_GAP), { ...question, id: `${REPEAT_PREFIX}${question.id}`, hint: slow ? 'Slow earlier — aim for instant recall' : 'Missed earlier — try again' }, ...questionQueue.slice(REPEAT_GAP)]
      : questionQueue;
    if (shouldRepeat) setRepeatCount((value) => value + 1);

    const reachedTarget = targetCount !== null && nextRecords.length >= targetCount + (shouldRepeat ? 1 : 0);
    // Missed pairs stay on screen until the user moves on, so there is time to read them.
    const waitForUser = Boolean(question.pairs) && !correctAnswer;
    const proceed = (step: () => void, delay: number) => {
      if (waitForUser) {
        pendingAdvanceRef.current = step;
        setAwaitingNext(true);
      } else {
        window.setTimeout(step, delay);
      }
    };

    if (reachedTarget) {
      proceed(finishSession, 450);
      return;
    }

    proceed(() => {
      const recent = nextRecords.slice(-6);
      const nextDifficulty = getAdaptiveDifficulty(
        difficulty,
        recent.map((record) => record.correct),
        recent.map((record) => record.responseTimeMs),
      );
      setDifficulty(nextDifficulty);
      const nextTarget = targetCount === null ? null : targetCount + (shouldRepeat ? 1 : 0);
      setQuestion(getNextQuestion(nextDifficulty, nextQueue, nextTarget === null ? null : nextTarget - nextRecords.length));
      setAnswer('');
      setPairRows([]);
      setPairResult(null);
      setFeedback(null);
      resetQuestionClock();
    }, correctAnswer && !slow ? 220 : 650);
  };

  const updatePairRow = (row: number, column: number, value: string) => setPairRows((rows) => {
    const next = (question.pairs ?? []).map((_, index) => [...(rows[index] ?? ['', ''])]);
    next[row][column] = value.replace(/\D/g, '');
    return next;
  });

  // The result page takes over once the session is saved.
  if (finished) return null;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5 flex items-center justify-between gap-3">
        <Link href={exitHref}><Button variant="ghost" size="sm"><ArrowLeft className="size-4" /> Exit</Button></Link>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">{categoryLabel(config.category)}</span>
          <span className="rounded-full bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1.5 text-xs font-semibold capitalize text-indigo-700 dark:text-indigo-300">{difficulty}</span>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniMetric icon={Target} label="Score" value={`${correct}/${completed}`} />
        <MiniMetric icon={Flame} label="Streak" value={currentStreak.toString()} accent={currentStreak >= 5} />
        <MiniMetric icon={Clock3} label={isSpeed ? 'Remaining' : 'This question'} value={isSpeed ? formatTimer(remaining) : `${(questionElapsed / 1000).toFixed(1)}s`} />
        <MiniMetric icon={Trophy} label="XP" value={`+${earnedXp}`} />
      </div>

      {targetCount && (
        <div className="mb-5">
          <div className="mb-2 flex justify-between text-xs font-semibold text-slate-500 dark:text-slate-400"><span>Question {Math.min(completed + 1, targetCount)} of {targetCount}</span><span>{Math.round(progress)}%</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"><div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${progress}%` }} /></div>
        </div>
      )}

      <Card className={cn('relative overflow-hidden p-5 transition-colors sm:p-8 md:p-10', feedback === 'correct' && 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/25', feedback === 'slow' && 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/25', feedback === 'incorrect' && 'border-rose-300 dark:border-rose-700 bg-rose-50/50 dark:bg-rose-950/25')}>
        {paused ? (
          <div className="flex min-h-[390px] flex-col items-center justify-center text-center">
            <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"><Pause className="size-7" /></div>
            <h2 className="text-2xl font-bold">Session paused</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">The question is hidden and the timer is frozen. Resume when you are ready.</p>
            <Button className="mt-6" onClick={() => setPaused(false)}><Play className="size-4 fill-current" /> Resume</Button>
            <div className="mt-3 text-xs text-slate-400 dark:text-slate-500">Press Space to resume</div>
          </div>
        ) : (
          <div className="flex min-h-[390px] flex-col items-center justify-center text-center">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Calculate mentally</div>
            <div className="mt-7 text-5xl font-bold tracking-tight text-slate-950 dark:text-slate-50 sm:text-6xl md:text-7xl">{question.prompt}</div>
            {question.hint && <div className="mt-4 text-xs font-medium text-slate-400 dark:text-slate-500">{question.hint}</div>}

            <form onSubmit={submitAnswer} className="mt-9 w-full max-w-md">
              {question.pairs ? (
                <div className="space-y-2">
                  {question.pairs.map((_, row) => (
                    <div key={row} className="flex items-center justify-center gap-3">
                      <PairInput inputRef={row === 0 ? inputRef : undefined} label={`Pair ${row + 1}, first number`} value={pairRows[row]?.[0] ?? ''} onChange={(value) => updatePairRow(row, 0, value)} />
                      <span className="text-2xl font-bold text-slate-400">×</span>
                      <PairInput label={`Pair ${row + 1}, second number`} value={pairRows[row]?.[1] ?? ''} onChange={(value) => updatePairRow(row, 1, value)} />
                    </div>
                  ))}
                </div>
              ) : (
              <input
                ref={inputRef}
                value={answer}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setAnswer(event.target.value)}
                inputMode={question.answer.includes('/') ? 'text' : 'decimal'}
                autoComplete="off"
                aria-label="Your answer"
                placeholder="Type your answer"
                className="h-16 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 text-center text-2xl font-bold text-slate-950 dark:text-slate-50 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/60"
              />
              )}
              <Button type="submit" className="mt-3 w-full" size="lg" disabled={awaitingNext ? false : (!question.pairs && !answer.trim()) || Boolean(feedback)}>{awaitingNext ? 'Next question' : 'Submit'} <span className="ml-auto rounded-md bg-white/15 px-2 py-0.5 text-xs">Enter ↵</span></Button>
            </form>

            <div className="mt-5 min-h-6 text-sm font-semibold">
              {feedback === 'correct' && <span className="inline-flex items-center gap-2 text-emerald-700 dark:text-emerald-300"><Check className="size-4" /> Correct</span>}
              {feedback === 'slow' && <span className="inline-flex items-center gap-2 text-amber-700 dark:text-amber-300"><Clock3 className="size-4" /> Correct, but over {((question.slowAfterMs ?? 0) / 1000).toFixed(0)}s{repeatMistakes && !question.id.startsWith(REPEAT_PREFIX) ? ' — it will come back' : ''}</span>}
              {feedback === 'incorrect' && !question.pairs && <span className="inline-flex items-center gap-2 text-rose-700 dark:text-rose-300"><X className="size-4" /> Correct answer: {question.answer}</span>}
              {feedback === 'incorrect' && question.pairs && pairResult && (
                <div className="space-y-2">
                  <div className="text-rose-700 dark:text-rose-300">{question.prompt.split(' =')[0]} is made by:</div>
                  <div className="flex flex-wrap justify-center gap-2">
                    {question.pairs.map((pair) => {
                      const found = pairResult.found.has(pairKey(pair));
                      return <span key={pairKey(pair)} className={cn('inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5', found ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200')}>{found ? <Check className="size-3.5" /> : <X className="size-3.5" />} {pair[0]} × {pair[1]}{found ? '' : ' (missed)'}</span>;
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="text-xs text-slate-400 dark:text-slate-500">Esc pauses • Enter submits</div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setPaused((value) => !value)}>{paused ? <Play className="size-4" /> : <Pause className="size-4" />} {paused ? 'Resume' : 'Pause'}</Button>
          {config.questionCount === 'endless' && completed > 0 && <Button variant="secondary" size="sm" onClick={finishSession}>Finish session</Button>}
        </div>
      </div>
    </div>
  );
}

function PairInput({ value, onChange, label, inputRef }: { value: string; onChange: (value: string) => void; label: string; inputRef?: React.Ref<HTMLInputElement> }) {
  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
      inputMode="numeric"
      autoComplete="off"
      aria-label={label}
      className="h-14 w-24 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center text-2xl font-bold text-slate-950 dark:text-slate-50 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/60"
    />
  );
}

function MiniMetric({ icon: Icon, label, value, accent = false }: { icon: typeof Target; label: string; value: string; accent?: boolean }) {
  return (
    <Card className="flex items-center gap-3 p-3 sm:p-4">
      <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400', accent && 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300')}><Icon className="size-4" /></div>
      <div className="min-w-0"><div className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</div><div className="mt-0.5 font-bold text-slate-900 dark:text-slate-100">{value}</div></div>
    </Card>
  );
}
