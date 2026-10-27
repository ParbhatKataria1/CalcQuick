export type CategoryId =
  | 'tables'
  | 'squares'
  | 'cubes'
  | 'fractionToPercent'
  | 'percentToFraction'
  | 'powers'
  | 'squareRoots'
  | 'addition'
  | 'subtraction'
  | 'multiplication'
  | 'division'
  | 'mixed'
  | 'banking';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type Question = {
  id: string;
  category: CategoryId;
  prompt: string;
  answer: string;
  numericAnswer?: number;
  tolerance?: number;
  hint?: string;
  /** Every factor pair that makes the prompt's number; the user enters each one. */
  pairs?: Array<[number, number]>;
  /** For recall drills: a correct answer slower than this is asked again later in the session. */
  slowAfterMs?: number;
};

export type AnswerRecord = {
  id: string;
  category: CategoryId;
  prompt: string;
  correctAnswer: string;
  userAnswer: string;
  correct: boolean;
  responseTimeMs: number;
  timestamp: number;
  /** The session this answer was given in; missing on answers saved before sessions had their own page. */
  sessionId?: string;
};

export type SessionRecord = {
  id: string;
  mode: 'practice' | 'speed' | 'banking' | 'weak' | 'mistakes' | 'daily';
  category: CategoryId;
  difficulty: Difficulty;
  startedAt: number;
  endedAt: number;
  total: number;
  correct: number;
  incorrect: number;
  accuracy: number;
  averageTimeMs: number;
  bestTimeMs: number;
  bestStreak: number;
  xpEarned: number;
};

export type PersonalBests = {
  highestAccuracy: number;
  fastestAverageMs: number | null;
  oneMinuteQuestions: number;
  fiveMinuteQuestions: number;
  longestStreak: number;
  highestDailyXp: number;
  mostQuestionsDay: number;
};

export type CategoryPerformance = {
  category: CategoryId;
  attempts: number;
  correct: number;
  accuracy: number;
  averageTimeMs: number;
};

export type AppStats = {
  xp: number;
  totalQuestions: number;
  totalCorrect: number;
  totalResponseTimeMs: number;
  bestResponseTimeMs: number | null;
  currentStreakDays: number;
  longestStreakDays: number;
  lastPracticeDate: string | null;
  answers: AnswerRecord[];
  sessions: SessionRecord[];
  personalBests: PersonalBests;
  dailyChallengeAwards: string[];
  soundEnabled: boolean;
};

export type SessionConfig = {
  category: CategoryId;
  difficulty: Difficulty;
  questionCount: number | 'endless';
  durationSeconds?: number;
  mode: SessionRecord['mode'];
};
