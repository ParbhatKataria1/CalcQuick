'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BankingTechnique } from '@/lib/question-generator';
import { specToQuery } from '@/lib/session-url';

export function BankingPracticeLauncher({ technique, label = 'Practice this technique' }: { technique: BankingTechnique; label?: string }) {
  const [complementDigits, setComplementDigits] = useState<1 | 2 | 3>(3);
  const href = `/banking-method/${technique}/practice?${specToQuery({ kind: 'banking', techniques: [technique], difficulty: 'medium', count: 10, digits: complementDigits })}`;

  return <div className="flex flex-wrap items-center justify-end gap-3">{technique === 'complements' && <label className="text-left"><span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Up to digits</span><select value={complementDigits} onChange={(event) => setComplementDigits(Number(event.target.value) as 1 | 2 | 3)} className="mt-1 h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-900"><option value={1}>1 digit · to 10</option><option value={2}>2 digits · to 100</option><option value={3}>3 digits · to 1000</option></select></label>}<Link href={href}><Button size="lg"><Play className="size-4 fill-current" /> {label}</Button></Link></div>;
}
