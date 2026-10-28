import Link from 'next/link';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { MultiplyDivideTechnique } from '@/lib/question-generator';
import { specToQuery } from '@/lib/session-url';

export function MultiplyDividePracticeLauncher({ technique }: { technique: MultiplyDivideTechnique }) {
  const href = `/multiply-divide/learn/${technique}/practice?${specToQuery({ kind: 'multiplyDivide', techniques: [technique], difficulty: 'medium', count: 10 })}`;
  return <Link href={href}><Button size="lg"><Play className="size-4 fill-current" /> Practice this technique</Button></Link>;
}
