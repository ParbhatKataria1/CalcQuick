'use client';

import { use, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { ExamRunner } from '@/components/exam/exam-runner';
import { mockApi } from '@/lib/mock-api';
import { useLoad } from '@/lib/use-load';

export default function ExamPage({ params }: { params: Promise<{ testId: string }> }) {
  const { testId } = use(params);
  const router = useRouter();
  const search = useSearchParams();
  const { data, error } = useLoad(async () => ({ test: await mockApi.getTest(testId), attempt: await mockApi.findAttemptForTest(testId) }), testId);

  // Tests start from the instructions page, and a submitted test opens its result.
  const redirect = !data ? null : !data.attempt ? `/mock-tests/test/${testId}/instructions` : data.attempt.endedAt ? `/mock-tests/result/${data.attempt.id}` : null;
  useEffect(() => {
    if (redirect) router.replace(redirect);
  }, [redirect, router]);

  if (!data || redirect || !data.attempt) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white text-sm text-[#333]">
        {error ? <div className="text-center"><p>{error}</p><Link href="/mock-tests" className="mt-3 inline-block font-semibold text-[#1f4e8c] underline">Back to mock tests</Link></div> : <Loader2 className="size-6 animate-spin text-[#1f4e8c]" />}
      </div>
    );
  }

  const { test, attempt } = data;
  const section = Math.min(Math.max(0, Number(search.get('s')) - 1 || 0), test.sections.length - 1);
  const question = Math.min(Math.max(0, Number(search.get('q')) - 1 || 0), test.sections[section].questions.length - 1);
  return <ExamRunner test={test} attempt={attempt} initialPosition={{ section, question }} />;
}
