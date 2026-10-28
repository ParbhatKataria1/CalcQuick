'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { ExamHeader } from '@/components/exam/exam-header';
import { StatusIcon, statusLabel } from '@/components/exam/question-palette';
import { useAuth } from '@/context/auth-context';
import { mockApi } from '@/lib/mock-api';
import { useLoad } from '@/lib/use-load';
import { MARKS_WRONG, sectionLabel, type MockAttempt, type MockTest } from '@/types/mock-test';

export default function InstructionsPage({ params }: { params: Promise<{ testId: string }> }) {
  const { testId } = use(params);
  const { data, error } = useLoad(async () => ({ test: await mockApi.getTest(testId), attempt: await mockApi.findAttemptForTest(testId) }), testId);

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-sm text-[#333]">
        {error ? <div className="text-center"><p>{error}</p><Link href="/mock-tests" className="mt-3 inline-block font-semibold text-[#1f4e8c] underline">Back to mock tests</Link></div> : <Loader2 className="size-6 animate-spin text-[#1f4e8c]" />}
      </div>
    );
  }
  return <Instructions test={data.test} attempt={data.attempt} />;
}

function Instructions({ test, attempt }: { test: MockTest; attempt: MockAttempt | null }) {
  const router = useRouter();
  const name = useAuth().user?.name ?? 'Candidate';
  const [agreed, setAgreed] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const totalQuestions = test.sections.reduce((sum, section) => sum + section.questions.length, 0);
  const totalMinutes = Math.round(test.sections.reduce((sum, section) => sum + section.durationSeconds, 0) / 60);

  const begin = async () => {
    setStarting(true);
    try {
      if (!attempt) await mockApi.startAttempt(test.id);
      router.replace(`/mock-tests/test/${test.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
      setStarting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#222]">
      <ExamHeader title={test.name} candidate={name} />
      <div className="border-b border-[#c9d6e8] bg-[#e8f0fa] px-4 py-2 text-sm font-bold text-[#1f4e8c]">Instructions</div>
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-5 px-4 py-6 text-sm leading-6">
        <h1 className="text-center text-lg font-bold">Please read the instructions carefully</h1>

        <section>
          <h2 className="font-bold underline">General Instructions:</h2>
          <ol className="mt-2 list-decimal space-y-2 pl-6">
            <li>The test has {totalQuestions} questions in {test.sections.length} {test.sections.length === 1 ? 'section' : 'sections'}, for a total of {totalMinutes} minutes.</li>
            <li>{test.timing === 'sectional'
              ? 'Each section has its own time limit. When a section’s time is over it is locked and the next section opens automatically. You can submit a section early with the Submit button.'
              : 'The clock covers the whole test. You can move between sections at any time using the section tabs.'}</li>
            <li>The clock at the top right shows the time left. When it reaches zero, the test is submitted automatically.</li>
            <li>The question palette on the right shows the status of each question:
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {(['notVisited', 'notAnswered', 'answered', 'marked', 'answeredMarked'] as const).map((status) => (
                  <div key={status} className="flex items-center gap-3"><StatusIcon status={status} label={1} size="sm" /> {statusLabel[status]}</div>
                ))}
              </div>
            </li>
            <li>Select an option and click <b>Save &amp; Next</b> to save your answer. Moving to another question through the palette without saving does not save the selected option.</li>
            <li><b>Mark for Review &amp; Next</b> saves the selected option (if any) and marks the question to revisit. Answered questions marked for review are evaluated.</li>
            <li><b>Clear Response</b> removes the saved answer of the current question.</li>
          </ol>
        </section>

        <section>
          <h2 className="font-bold underline">Marking scheme:</h2>
          <p className="mt-2">Each correct answer carries 1 mark. {Math.abs(MARKS_WRONG)} mark is deducted for each wrong answer. Unanswered questions carry no penalty.</p>
          <table className="mt-3 w-full border-collapse text-left">
            <thead><tr className="bg-[#e8f0fa]"><th className="border border-[#c9d6e8] px-3 py-1.5">Section</th><th className="border border-[#c9d6e8] px-3 py-1.5">Questions</th><th className="border border-[#c9d6e8] px-3 py-1.5">Max marks</th><th className="border border-[#c9d6e8] px-3 py-1.5">Time</th></tr></thead>
            <tbody>
              {test.sections.map((section) => (
                <tr key={section.section}>
                  <td className="border border-[#c9d6e8] px-3 py-1.5">{sectionLabel[section.section]}</td>
                  <td className="border border-[#c9d6e8] px-3 py-1.5">{section.questions.length}</td>
                  <td className="border border-[#c9d6e8] px-3 py-1.5">{section.questions.length}</td>
                  <td className="border border-[#c9d6e8] px-3 py-1.5">{test.timing === 'sectional' ? `${Math.round(section.durationSeconds / 60)} min` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="space-y-3 border-t border-[#c9d6e8] pt-4">
          <label className="flex items-start gap-2">
            <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} className="mt-1 size-4 accent-[#1f4e8c]" />
            <span>I have read and understood the instructions. I agree that the test will be submitted automatically when the time is over.</span>
          </label>
          {error && <p className="text-[#c0392b]">{error}</p>}
        </section>
      </main>
      <footer className="flex items-center justify-between gap-3 border-t border-[#c9d6e8] bg-[#f5f7fa] px-4 py-3">
        <Link href={`/mock-tests/${test.sourceId}`} className="rounded border border-[#b9bec7] bg-white px-4 py-2 text-sm font-semibold">Back</Link>
        <button type="button" disabled={!agreed || starting} onClick={begin} className="rounded bg-[#2f6fb3] px-5 py-2 text-sm font-bold text-white disabled:opacity-50">
          {attempt && !attempt.endedAt ? 'Resume the test' : 'I am ready to begin'}
        </button>
      </footer>
    </div>
  );
}
