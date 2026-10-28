import { countStatuses } from '@/lib/mock-scoring';
import { sectionLabel, type MockTestSection, type QuestionResponse } from '@/types/mock-test';

type Props = {
  title: string;
  note: string;
  sections: MockTestSection[];
  responses: QuestionResponse[][];
  onCancel: () => void;
  onConfirm: () => void;
};

/** The pre-submit table of the IBPS / SBI interface: what is answered, marked and untouched per section. */
export function SubmitSummary({ title, note, sections, responses, onCancel, onConfirm }: Props) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-3xl overflow-hidden rounded bg-white text-[#222] shadow-2xl">
        <div className="bg-[#1f4e8c] px-4 py-2.5 font-bold text-white">{title}</div>
        <div className="overflow-x-auto p-4">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-[#e8f0fa] text-left">
                {['Section', 'No. of Questions', 'Answered', 'Not Answered', 'Marked for Review', 'Answered & Marked', 'Not Visited'].map((heading) => (
                  <th key={heading} className="border border-[#c9d6e8] px-2 py-1.5 font-semibold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sections.map((section, index) => {
                const counts = countStatuses(responses[index]);
                return (
                  <tr key={section.section}>
                    <td className="border border-[#c9d6e8] px-2 py-1.5">{sectionLabel[section.section]}</td>
                    <td className="border border-[#c9d6e8] px-2 py-1.5">{section.questions.length}</td>
                    <td className="border border-[#c9d6e8] px-2 py-1.5">{counts.answered}</td>
                    <td className="border border-[#c9d6e8] px-2 py-1.5">{counts.notAnswered}</td>
                    <td className="border border-[#c9d6e8] px-2 py-1.5">{counts.marked}</td>
                    <td className="border border-[#c9d6e8] px-2 py-1.5">{counts.answeredMarked}</td>
                    <td className="border border-[#c9d6e8] px-2 py-1.5">{counts.notVisited}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-4 text-sm">{note}</p>
        </div>
        <div className="flex justify-end gap-2 border-t border-[#dde3ea] bg-[#f5f7fa] px-4 py-3">
          <button type="button" onClick={onCancel} className="rounded border border-[#b9bec7] bg-white px-4 py-2 text-sm font-semibold">No, go back</button>
          <button type="button" onClick={onConfirm} className="rounded bg-[#1f8f4e] px-4 py-2 text-sm font-bold text-white">Yes, submit</button>
        </div>
      </div>
    </div>
  );
}
