'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SessionEngine } from '@/components/session-engine';
import { generateBankingTechniqueSet, type BankingTechnique } from '@/lib/question-generator';
import type { Difficulty, Question, SessionConfig } from '@/types';

export function BankingPracticeLauncher({ technique, label = 'Practice this technique' }: { technique: BankingTechnique; label?: string }) {
  const [session, setSession] = useState<{ config: SessionConfig; questions: Question[] } | null>(null);
  if (session) return <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-50 p-4 dark:bg-slate-950 md:p-8"><SessionEngine config={session.config} initialQuestions={session.questions} onExit={() => setSession(null)} /></div>;

  const start = () => {
    const difficulty: Difficulty = 'medium';
    setSession({
      config: { category: 'banking', difficulty, questionCount: 10, mode: 'banking' },
      questions: generateBankingTechniqueSet([technique], 10, difficulty),
    });
  };

  return <Button size="lg" onClick={start}><Play className="size-4 fill-current" /> {label}</Button>;
}
