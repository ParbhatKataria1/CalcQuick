'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { ArrowLeft, Check, Clock3, Flame, Pause, Play, RotateCcw, Target, Trophy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useStats } from '@/context/stats-context';
import { generateQuestion, getAdaptiveDifficulty, isAnswerCorrect } from '@/lib/question-generator';
import { categoryLabel } from '@/constants/categories';
import { getWeakCategories, sessionToXp } from '@/lib/stats';
import type { AnswerRecord, Difficulty, Question, SessionConfig, SessionRecord } from '@/types';
import { cn } from '@/lib/utils';

type Props = {
  config: SessionConfig;
  onExit: () => void;
  initialQuestions?: Question[];
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

export function SessionEngine({ config, onExit, initialQuestions }: Props) {
  const { stats, recordSession } = useStats();
  const [difficulty, setDifficulty] = useState<Difficulty>(config.difficulty);
  const [question, setQuestion] = useState<Question>(() => initialQuestions?.[0] ?? generateQuestion(config.category, config.difficulty));
  const [answer, setAnswer] = useState('');
  const [records, setRecords] = useState<AnswerRecord[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [paused, setPaused] = useState(false);
  const [finished, setFinished] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [earnedXp, setEarnedXp] = useState(0);
  const [remaining, setRemaining] = useState(config.durationSeconds ?? 0);
  const [questionElapsed, setQuestionElapsed] = useState(0);
  const [questionQueue, setQuestionQueue] = useState<Question[]>(initialQuestions?.slice(1) ?? []);
  const inputRef = useRef<HTMLInputElement>(null);
  const sessionStartRef = useRef(Date.now());
  const questionStartRef = useRef(Date.now());
  const accumulatedQuestionMsRef = useRef(0);
  const finalizedRef = useRef(false);
  const finishRequestedRef = useRef(false);

  const isSpeed = Boolean(config.durationSeconds);
  const targetCount = config.questionCount === 'endless' ? null : config.questionCount;
  const weakCategories = useMemo(() => getWeakCategories(stats), [stats]);
  const weightedWeak = useMemo(() => weakCategories.flatMap((category) => [category, category, category]), [weakCategories]);

  const completed = records.length;
  const correct = records.filter((record) => record.correct).length;
  const accuracy = completed ? Math.round((correct / completed) * 100) : 100;
  const progress = targetCount ? Math.min(100, (completed / targetCount) * 100) : 0;

  const getNextQuestion = useCallback((nextDifficulty: Difficulty) => {
    if (questionQueue.length) {
      const [next, ...rest] = questionQueue;
      setQuestionQueue(rest);
      return next;
    }
    const weighted = config.mode === 'weak' && weightedWeak.length ? weightedWeak : undefined;
    return generateQuestion(config.category, nextDifficulty, weighted);
  }, [config.category, config.mode, questionQueue, weightedWeak]);

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
    const xpEarned = sessionToXp(baseSession);
    setEarnedXp(xpEarned);
    recordSession({ ...baseSession, xpEarned }, records, config.durationSeconds);
  }, [bestStreak, config, finished, recordSession, records]);

  const submitAnswer = (event: React.FormEvent) => {
    event.preventDefault();
    if (!answer.trim() || paused || finished || feedback) return;

    const responseTimeMs = accumulatedQuestionMsRef.current + Date.now() - questionStartRef.current;
    const correctAnswer = isAnswerCorrect(question, answer);
    const nextStreak = correctAnswer ? currentStreak + 1 : 0;
    const nextRecord: AnswerRecord = {
      id: question.id,
      category: question.category,
      prompt: question.prompt,
      correctAnswer: question.answer,
      userAnswer: answer.trim(),
      correct: correctAnswer,
      responseTimeMs,
      timestamp: Date.now(),
    };
    const nextRecords = [...records, nextRecord];
    setRecords(nextRecords);
    setCurrentStreak(nextStreak);
    setBestStreak((value) => Math.max(value, nextStreak));
    setFeedback(correctAnswer ? 'correct' : 'incorrect');
    if (stats.soundEnabled) playTone(correctAnswer);

    const immediateXp = correctAnswer ? 10 + (responseTimeMs < 3000 ? 5 : 0) + (nextStreak > 0 && nextStreak % 5 === 0 ? 10 : 0) : 0;
    setEarnedXp((value) => value + immediateXp);

    const reachedTarget = targetCount !== null && nextRecords.length >= targetCount;
    if (reachedTarget) {
      window.setTimeout(finishSession, 450);
      return;
    }

    window.setTimeout(() => {
      const recent = nextRecords.slice(-6);
      const nextDifficulty = getAdaptiveDifficulty(
        difficulty,
        recent.map((record) => record.correct),
        recent.map((record) => record.responseTimeMs),
      );
      setDifficulty(nextDifficulty);
      setQuestion(getNextQuestion(nextDifficulty));
      setAnswer('');
      setFeedback(null);
      resetQuestionClock();
    }, correctAnswer ? 220 : 650);
  };

  const retryMistakes = () => {
    const mistakes = records.filter((record) => !record.correct).map<Question>((record) => ({
      id: `retry-${record.id}-${Date.now()}`,
      category: record.category,
      prompt: record.prompt,
      answer: record.correctAnswer,
      numericAnswer: Number.isFinite(Number(record.correctAnswer)) ? Number(record.correctAnswer) : undefined,
      tolerance: record.correctAnswer.includes('.') ? 0.05 : 0,
    }));
    if (!mistakes.length) return;
    finalizedRef.current = false;
    finishRequestedRef.current = false;
    sessionStartRef.current = Date.now();
    setRecords([]);
    setCurrentStreak(0);
    setBestStreak(0);
    setEarnedXp(0);
    setQuestion(mistakes[0]);
    setQuestionQueue(mistakes.slice(1));
    setRemaining(config.durationSeconds ?? 0);
    setFinished(false);
    setFeedback(null);
    setAnswer('');
    resetQuestionClock();
  };

  if (finished) {
    const mistakes = records.filter((record) => !record.correct);
    const avg = records.length ? records.reduce((sum, record) => sum + record.responseTimeMs, 0) / records.length : 0;
    const best = records.length ? Math.min(...records.map((record) => record.responseTimeMs)) : 0;
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
          <ResultMetric label="Questions" value={records.length.toString()} />
          <ResultMetric label="Accuracy" value={`${accuracy}%`} />
          <ResultMetric label="Average time" value={`${(avg / 1000).toFixed(1)}s`} />
          <ResultMetric label="Best time" value={`${(best / 1000).toFixed(1)}s`} />
          <ResultMetric label="Correct" value={correct.toString()} />
          <ResultMetric label="Incorrect" value={mistakes.length.toString()} />
          <ResultMetric label="Best streak" value={bestStreak.toString()} />
          <ResultMetric label="XP earned" value={`+${earnedXp}`} />
        </div>

        {mistakes.length > 0 ? (
          <Card className="overflow-hidden">
            <div className="border-b border-slate-200 dark:border-slate-800 px-5 py-4">
              <h2 className="font-bold">Mistake review</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">These are the questions worth repeating immediately.</p>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {mistakes.map((record) => (
                <div key={record.id} className="grid gap-3 px-5 py-4 text-sm sm:grid-cols-[1fr_auto_auto_auto] sm:items-center">
                  <div className="font-semibold text-slate-900 dark:text-slate-100">{record.prompt}</div>
                  <div><span className="text-slate-400 dark:text-slate-500">You:</span> <span className="font-semibold text-rose-600 dark:text-rose-400">{record.userAnswer}</span></div>
                  <div><span className="text-slate-400 dark:text-slate-500">Correct:</span> <span className="font-semibold text-emerald-700 dark:text-emerald-300">{record.correctAnswer}</span></div>
                  <div className="text-slate-500 dark:text-slate-400">{(record.responseTimeMs / 1000).toFixed(1)}s</div>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-5 text-center text-emerald-800 dark:text-emerald-200">
            <div className="font-bold">Perfect round — no mistakes to review.</div>
          </Card>
        )}

        <div className="flex flex-wrap justify-center gap-3">
          {mistakes.length > 0 && <Button variant="secondary" onClick={retryMistakes}><RotateCcw className="size-4" /> Practice Mistakes Again</Button>}
          <Button variant="outline" onClick={onExit}><ArrowLeft className="size-4" /> Back to setup</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5 flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onExit}><ArrowLeft className="size-4" /> Exit</Button>
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

      <Card className={cn('relative overflow-hidden p-5 transition-colors sm:p-8 md:p-10', feedback === 'correct' && 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/25', feedback === 'incorrect' && 'border-rose-300 dark:border-rose-700 bg-rose-50/50 dark:bg-rose-950/25')}>
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
              <Button type="submit" className="mt-3 w-full" size="lg" disabled={!answer.trim() || Boolean(feedback)}>Submit <span className="ml-auto rounded-md bg-white/15 px-2 py-0.5 text-xs">Enter ↵</span></Button>
            </form>

            <div className="mt-5 h-6 text-sm font-semibold">
              {feedback === 'correct' && <span className="inline-flex items-center gap-2 text-emerald-700 dark:text-emerald-300"><Check className="size-4" /> Correct</span>}
              {feedback === 'incorrect' && <span className="inline-flex items-center gap-2 text-rose-700 dark:text-rose-300"><X className="size-4" /> Correct answer: {question.answer}</span>}
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

function MiniMetric({ icon: Icon, label, value, accent = false }: { icon: typeof Target; label: string; value: string; accent?: boolean }) {
  return (
    <Card className="flex items-center gap-3 p-3 sm:p-4">
      <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400', accent && 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300')}><Icon className="size-4" /></div>
      <div className="min-w-0"><div className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</div><div className="mt-0.5 font-bold text-slate-900 dark:text-slate-100">{value}</div></div>
    </Card>
  );
}

function ResultMetric({ label, value }: { label: string; value: string }) {
  return <Card className="p-4 text-center"><div className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</div><div className="mt-2 text-2xl font-bold text-slate-950 dark:text-slate-50">{value}</div></Card>;
}
