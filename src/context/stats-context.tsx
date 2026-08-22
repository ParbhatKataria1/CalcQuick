'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AnswerRecord, AppStats, SessionRecord } from '@/types';
import { defaultStats } from '@/lib/stats';

const STORAGE_KEY = 'banking-calculation-trainer-v1';

type StatsContextValue = {
  stats: AppStats;
  hydrated: boolean;
  recordSession: (session: SessionRecord, answers: AnswerRecord[], durationSeconds?: number) => void;
  toggleSound: () => void;
  resetProgress: () => void;
};

const StatsContext = createContext<StatsContextValue | null>(null);

const localDateKey = (timestamp = Date.now()) => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const diffDays = (from: string, to: string) => {
  const a = new Date(`${from}T00:00:00`).getTime();
  const b = new Date(`${to}T00:00:00`).getTime();
  return Math.round((b - a) / 86400000);
};

export function StatsProvider({ children }: { children: React.ReactNode }) {
  const [stats, setStats] = useState<AppStats>(defaultStats);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setStats({ ...defaultStats, ...JSON.parse(raw) });
    } catch {
      setStats(defaultStats);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  }, [stats, hydrated]);

  const recordSession = useCallback((session: SessionRecord, answers: AnswerRecord[], durationSeconds?: number) => {
    setStats((previous) => {
      const today = localDateKey(session.endedAt);
      const yesterdayGap = previous.lastPracticeDate ? diffDays(previous.lastPracticeDate, today) : null;
      const currentStreakDays = previous.lastPracticeDate === today
        ? previous.currentStreakDays
        : yesterdayGap === 1
          ? previous.currentStreakDays + 1
          : 1;

      const newTotal = previous.totalQuestions + answers.length;
      const newCorrect = previous.totalCorrect + answers.filter((answer) => answer.correct).length;
      const totalMs = previous.totalResponseTimeMs + answers.reduce((sum, answer) => sum + answer.responseTimeMs, 0);
      const sessionBest = answers.length ? Math.min(...answers.map((answer) => answer.responseTimeMs)) : null;
      const allAnswers = [...previous.answers, ...answers].slice(-3000);
      const allSessions = [...previous.sessions, session].slice(-300);

      const todaysSessions = allSessions.filter((item) => localDateKey(item.endedAt) === today);
      const todaysXp = todaysSessions.reduce((sum, item) => sum + item.xpEarned, 0);
      const todaysQuestions = todaysSessions.reduce((sum, item) => sum + item.total, 0);

      const alreadyAwarded = previous.dailyChallengeAwards?.includes(today) ?? false;
      const dailyAccuracy = todaysQuestions ? (todaysSessions.reduce((sum, item) => sum + item.correct, 0) / todaysQuestions) * 100 : 0;
      const dailyAverageMs = todaysQuestions ? todaysSessions.reduce((sum, item) => sum + item.averageTimeMs * item.total, 0) / todaysQuestions : 0;
      const dailyCompleted = todaysQuestions >= 50 && dailyAccuracy >= 90 && dailyAverageMs < 5000;
      const dailyBonus = dailyCompleted && !alreadyAwarded ? 500 : 0;

      const personalBests = { ...previous.personalBests };
      personalBests.highestAccuracy = Math.max(personalBests.highestAccuracy, session.accuracy);
      personalBests.fastestAverageMs = personalBests.fastestAverageMs === null
        ? session.averageTimeMs
        : Math.min(personalBests.fastestAverageMs, session.averageTimeMs);
      personalBests.longestStreak = Math.max(personalBests.longestStreak, session.bestStreak);
      personalBests.highestDailyXp = Math.max(personalBests.highestDailyXp, todaysXp + dailyBonus);
      personalBests.mostQuestionsDay = Math.max(personalBests.mostQuestionsDay, todaysQuestions);
      if (durationSeconds === 60) personalBests.oneMinuteQuestions = Math.max(personalBests.oneMinuteQuestions, session.total);
      if (durationSeconds === 300) personalBests.fiveMinuteQuestions = Math.max(personalBests.fiveMinuteQuestions, session.total);

      return {
        ...previous,
        xp: previous.xp + session.xpEarned + dailyBonus,
        totalQuestions: newTotal,
        totalCorrect: newCorrect,
        totalResponseTimeMs: totalMs,
        bestResponseTimeMs: sessionBest === null
          ? previous.bestResponseTimeMs
          : previous.bestResponseTimeMs === null
            ? sessionBest
            : Math.min(previous.bestResponseTimeMs, sessionBest),
        currentStreakDays,
        longestStreakDays: Math.max(previous.longestStreakDays, currentStreakDays),
        lastPracticeDate: today,
        answers: allAnswers,
        sessions: allSessions,
        personalBests,
        dailyChallengeAwards: dailyBonus ? [...(previous.dailyChallengeAwards ?? []), today] : (previous.dailyChallengeAwards ?? []),
      };
    });
  }, []);

  const toggleSound = useCallback(() => setStats((previous) => ({ ...previous, soundEnabled: !previous.soundEnabled })), []);

  const resetProgress = useCallback(() => setStats({ ...defaultStats, soundEnabled: stats.soundEnabled }), [stats.soundEnabled]);

  const value = useMemo(() => ({ stats, hydrated, recordSession, toggleSound, resetProgress }), [stats, hydrated, recordSession, toggleSound, resetProgress]);

  return <StatsContext.Provider value={value}>{children}</StatsContext.Provider>;
}

export function useStats() {
  const context = useContext(StatsContext);
  if (!context) throw new Error('useStats must be used inside StatsProvider');
  return context;
}
