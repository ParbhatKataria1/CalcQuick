import { notFound } from 'next/navigation';
import { NumberFactPage } from '@/components/number-fact-page';
import type { NumberFactKind } from '@/lib/number-fact-generator';

const kinds: NumberFactKind[] = ['tables', 'squares', 'cubes'];
export function generateStaticParams() { return kinds.map((kind) => ({ kind })); }
export default async function NumberFactRoute({ params }: { params: Promise<{ kind: string }> }) { const { kind } = await params; if (!kinds.includes(kind as NumberFactKind)) notFound(); return <NumberFactPage kind={kind as NumberFactKind} />; }
