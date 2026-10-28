import type { AnswerRecord, AppStats, CategoryId, CategoryPerformance, SessionRecord } from '@/types';

export const defaultStats: AppStats = {
  xp: 0,
  totalQuestions: 0,
  totalCorrect: 0,
  totalResponseTimeMs: 0,
  bestResponseTimeMs: null,
  currentStreakDays: 0,
  longestStreakDays: 0,
  lastPracticeDate: null,
  answers: [],
  sessions: [],
  personalBests: {
    highestAccuracy: 0,
    fastestAverageMs: null,
    oneMinuteQuestions: 0,
    fiveMinuteQuestions: 0,
    longestStreak: 0,
    highestDailyXp: 0,
    mostQuestionsDay: 0,
  },
  dailyChallengeAwards: [],
  soundEnabled: true,
};

export const getLevel = (xp: number) => {
  const thresholds = [0, 500, 1500, 3000, 5500, 8500, 12500, 18000];
  const names = ['Beginner', 'Calculator', 'Fast Thinker', 'Number Ninja', 'Quant Warrior', 'Banking Quant Master', 'Elite Calculator', 'Speed Legend'];
  let index = thresholds.findIndex((threshold, i) => xp >= threshold && (i === thresholds.length - 1 || xp < thresholds[i + 1]));
  if (index === -1) index = thresholds.length - 1;
  const nextThreshold = thresholds[Math.min(index + 1, thresholds.length - 1)];
  const currentThreshold = thresholds[index];
  const progress = index === thresholds.length - 1 ? 100 : ((xp - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
  return { level: index + 1, name: names[index], progress: Math.max(0, Math.min(100, progress)), nextThreshold };
};

export const getCategoryPerformance = (stats: AppStats): CategoryPerformance[] => {
  const map = new Map<CategoryId, { attempts: number; correct: number; totalMs: number }>();
  for (const answer of stats.answers) {
    const current = map.get(answer.category) ?? { attempts: 0, correct: 0, totalMs: 0 };
    current.attempts += 1;
    current.correct += answer.correct ? 1 : 0;
    current.totalMs += answer.responseTimeMs;
    map.set(answer.category, current);
  }
  return Array.from(map.entries()).map(([category, data]) => ({
    category,
    attempts: data.attempts,
    correct: data.correct,
    accuracy: data.attempts ? (data.correct / data.attempts) * 100 : 0,
    averageTimeMs: data.attempts ? data.totalMs / data.attempts : 0,
  }));
};

export const getWeakCategories = (stats: AppStats): CategoryId[] => {
  const performance = getCategoryPerformance(stats)
    .filter((item) => item.attempts >= 3 && item.category !== 'banking' && item.category !== 'mixed')
    .sort((a, b) => {
      const scoreA = a.accuracy - Math.min(25, a.averageTimeMs / 400);
      const scoreB = b.accuracy - Math.min(25, b.averageTimeMs / 400);
      return scoreA - scoreB;
    });
  return performance.slice(0, 3).map((item) => item.category);
};

export const getStrongestAndWeakest = (stats: AppStats) => {
  const performance = getCategoryPerformance(stats).filter((item) => item.attempts >= 3);
  if (!performance.length) return { strongest: null, weakest: null };
  const sorted = [...performance].sort((a, b) => b.accuracy - a.accuracy || a.averageTimeMs - b.averageTimeMs);
  return { strongest: sorted[0], weakest: sorted[sorted.length - 1] };
};

export const getDailySeries = (stats: AppStats, days = 7) => {
  const today = new Date();
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - 1 - index));
    const key = date.toISOString().slice(0, 10);
    const answers = stats.answers.filter((answer) => new Date(answer.timestamp).toISOString().slice(0, 10) === key);
    const correct = answers.filter((answer) => answer.correct).length;
    const avg = answers.length ? answers.reduce((sum, answer) => sum + answer.responseTimeMs, 0) / answers.length : 0;
    return {
      date: date.toLocaleDateString('en-IN', { weekday: 'short' }),
      fullDate: key,
      questions: answers.length,
      accuracy: answers.length ? Math.round((correct / answers.length) * 100) : 0,
      avgSeconds: Number((avg / 1000).toFixed(1)),
    };
  });
};

export const sessionToXp = (session: Omit<SessionRecord, 'xpEarned'>) => {
  const base = session.correct * 10;
  const accuracyBonus = session.accuracy >= 90 ? 50 : session.accuracy >= 80 ? 20 : 0;
  const speedBonus = session.averageTimeMs > 0 && session.averageTimeMs < 3000 ? session.correct * 5 : 0;
  const streakBonus = session.bestStreak >= 10 ? 25 : session.bestStreak >= 5 ? 10 : 0;
  return base + accuracyBonus + speedBonus + streakBonus;
};

/**
 * The calendar day of a timestamp in the player's time zone. The offset is the browser's
 * `getTimezoneOffset()`, so the server counts streaks in the same days as the player.
 */
export const localDateKey = (timestamp: number, timezoneOffsetMinutes: number) =>
  new Date(timestamp - timezoneOffsetMinutes * 60_000).toISOString().slice(0, 10);

const diffDays = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

/** Adds a finished session to the stats. Runs in the browser for instant feedback and on the server, which keeps the saved copy. */
export function applySession(previous: AppStats, session: SessionRecord, answers: AnswerRecord[], durationSeconds: number | undefined, timezoneOffsetMinutes: number): AppStats {
  const dateKey = (timestamp: number) => localDateKey(timestamp, timezoneOffsetMinutes);
  const today = dateKey(session.endedAt);
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
  const allAnswers = [...previous.answers, ...answers.map((answer) => ({ ...answer, sessionId: session.id }))].slice(-3000);
  const allSessions = [...previous.sessions, session].slice(-300);

  const todaysSessions = allSessions.filter((item) => dateKey(item.endedAt) === today);
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
}

/** Removes a session and its answers. Totals and XP drop accordingly; streaks and personal bests stay as earned. */
export function removeSession(previous: AppStats, sessionId: string): AppStats {
  const session = previous.sessions.find((item) => item.id === sessionId);
  if (!session) return previous;
  const answers = previous.answers.filter((answer) => answer.sessionId === sessionId);
  return {
    ...previous,
    xp: Math.max(0, previous.xp - session.xpEarned),
    totalQuestions: Math.max(0, previous.totalQuestions - answers.length),
    totalCorrect: Math.max(0, previous.totalCorrect - answers.filter((answer) => answer.correct).length),
    totalResponseTimeMs: Math.max(0, previous.totalResponseTimeMs - answers.reduce((sum, answer) => sum + answer.responseTimeMs, 0)),
    answers: previous.answers.filter((answer) => answer.sessionId !== sessionId),
    sessions: previous.sessions.filter((item) => item.id !== sessionId),
  };
}
