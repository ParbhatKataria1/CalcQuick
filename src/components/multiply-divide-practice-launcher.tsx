'use client';
import { useState } from 'react';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SessionEngine } from '@/components/session-engine';
import { generateMultiplyDivideSet, type MultiplyDivideTechnique } from '@/lib/question-generator';
import type { Question, SessionConfig } from '@/types';

export function MultiplyDividePracticeLauncher({ technique }: { technique: MultiplyDivideTechnique }) {
  const [session, setSession] = useState<{ config: SessionConfig; questions: Question[] } | null>(null);
  if (session) return <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-50 p-4 dark:bg-slate-950 md:p-8"><SessionEngine config={session.config} initialQuestions={session.questions} onExit={() => setSession(null)} /></div>;
  const start = () => {
    const questions = generateMultiplyDivideSet([technique], 10, 'medium');
    setSession({ config: { category: questions[0].category, difficulty: 'medium', questionCount: 10, mode: 'banking' }, questions });
  };
  return <Button size="lg" onClick={start}><Play className="size-4 fill-current" /> Practice this technique</Button>;
}
