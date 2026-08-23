'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SessionEngine } from '@/components/session-engine';
import { generateBankingTechniqueSet, type BankingTechnique } from '@/lib/question-generator';
import type { Difficulty, Question, SessionConfig } from '@/types';

export function BankingPracticeLauncher({ technique, label = 'Practice this technique' }: { technique: BankingTechnique; label?: string }) {
  const [session, setSession] = useState<{ config: SessionConfig; questions: Question[] } | null>(null);
  const [complementDigits, setComplementDigits] = useState<1 | 2 | 3>(3);
  if (session) return <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-50 p-4 dark:bg-slate-950 md:p-8"><SessionEngine config={session.config} initialQuestions={session.questions} onExit={() => setSession(null)} /></div>;

  const start = () => {
    const difficulty: Difficulty = 'medium';
    setSession({
      config: { category: 'banking', difficulty, questionCount: 10, mode: 'banking' },
      questions: generateBankingTechniqueSet([technique], 10, difficulty, complementDigits),
    });
  };

  return <div className="flex flex-wrap items-center justify-end gap-3">{technique === 'complements' && <label className="text-left"><span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Up to digits</span><select value={complementDigits} onChange={(event) => setComplementDigits(Number(event.target.value) as 1 | 2 | 3)} className="mt-1 h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-900"><option value={1}>1 digit · to 10</option><option value={2}>2 digits · to 100</option><option value={3}>3 digits · to 1000</option></select></label>}<Button size="lg" onClick={start}><Play className="size-4 fill-current" /> {label}</Button></div>;
}
