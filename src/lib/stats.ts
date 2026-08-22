import type { AppStats, CategoryId, CategoryPerformance, SessionRecord } from '@/types';

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
