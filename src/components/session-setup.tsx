'use client';

import { Check, Play, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { categories } from '@/constants/categories';
import type { CategoryId, Difficulty, SessionConfig } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Props = {
  title?: string;
  description?: string;
  defaultCategory?: CategoryId;
  mode?: SessionConfig['mode'];
  onStart: (config: SessionConfig) => void;
};

export function SessionSetup({
  title = 'Choose your practice',
  description = 'Pick one calculation skill, set the difficulty, and train it until the answer feels automatic.',
  defaultCategory = 'tables',
  mode = 'practice',
  onStart,
}: Props) {
  const [category, setCategory] = useState<CategoryId>(defaultCategory);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [questionCount, setQuestionCount] = useState<number | 'endless'>(20);

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
          <Sparkles className="size-3.5" /> Focused training
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-50 md:text-3xl">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300 md:text-base">{description}</p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">1. Calculation skill</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {categories.map((item) => {
            const Icon = item.icon;
            const active = category === item.id;
            return (
              <button key={item.id} onClick={() => setCategory(item.id)} className="text-left">
                <Card className={cn('relative h-full p-4 transition-all hover:-translate-y-0.5 hover:shadow-md', active && 'border-indigo-300 dark:border-indigo-700 ring-2 ring-indigo-100')}>
                  {active && <div className="absolute right-3 top-3 flex size-6 items-center justify-center rounded-full bg-indigo-600 text-white"><Check className="size-3.5" /></div>}
                  <div className={cn('mb-4 flex size-10 items-center justify-center rounded-xl', active ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300')}>
                    <Icon className="size-5" />
                  </div>
                  <div className="font-bold text-slate-900 dark:text-slate-100">{item.label}</div>
                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{item.description}</p>
                  <div className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Range: {item.range}</div>
                </Card>
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">2. Difficulty</h2>
          <Card className="grid grid-cols-3 gap-2 p-2">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map((item) => (
              <button
                key={item}
                onClick={() => setDifficulty(item)}
                className={cn('rounded-xl px-4 py-3 text-sm font-semibold capitalize transition-colors', difficulty === item ? 'bg-slate-950 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800')}
              >
                {item}
              </button>
            ))}
          </Card>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">3. Session length</h2>
          <Card className="grid grid-cols-5 gap-2 p-2">
            {[10, 20, 30, 50, 'endless'].map((item) => (
              <button
                key={item}
                onClick={() => setQuestionCount(item as number | 'endless')}
                className={cn('rounded-xl px-2 py-3 text-sm font-semibold transition-colors', questionCount === item ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800')}
              >
                {item === 'endless' ? '∞' : item}
              </button>
            ))}
          </Card>
        </section>
      </div>

      <div className="flex justify-end">
        <Button size="lg" onClick={() => onStart({ category, difficulty, questionCount, mode })}>
          <Play className="size-4 fill-current" /> Start Practice
        </Button>
      </div>
    </div>
  );
}
