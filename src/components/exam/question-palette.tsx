import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { QuestionResponse, QuestionStatus } from '@/types/mock-test';
import { countStatuses } from '@/lib/mock-scoring';

/** The exam UI keeps the fixed light look of the IBPS / SBI interface, whatever the app theme. */
export const statusLabel: Record<QuestionStatus, string> = {
  answered: 'Answered',
  notAnswered: 'Not Answered',
  notVisited: 'Not Visited',
  marked: 'Marked for Review',
  answeredMarked: 'Answered & Marked for Review (will be considered for evaluation)',
};

// Answered points up and Not Answered points down, as in the TCS iON exam interface.
const shapes: Record<QuestionStatus, { className: string; clipPath?: string }> = {
  answered: { className: 'bg-[#3fa046] text-white', clipPath: 'polygon(50% 0, 100% 28%, 100% 100%, 0 100%, 0 28%)' },
  notAnswered: { className: 'bg-[#e4542c] text-white', clipPath: 'polygon(0 0, 100% 0, 100% 72%, 50% 100%, 0 72%)' },
  notVisited: { className: 'border border-[#b9bec7] bg-[#eef0f3] text-[#333] rounded-[3px]' },
  marked: { className: 'bg-[#6b3fa0] text-white rounded-full' },
  answeredMarked: { className: 'bg-[#6b3fa0] text-white rounded-full' },
};

export function StatusIcon({ status, label, size = 'md', current = false }: { status: QuestionStatus; label?: string | number; size?: 'sm' | 'md'; current?: boolean }) {
  const shape = shapes[status];
  return (
    <span className={cn('relative inline-flex shrink-0', current && 'rounded-[4px] outline-2 outline-offset-2 outline-[#2f6fb3]')}>
      <span style={shape.clipPath ? { clipPath: shape.clipPath } : undefined} className={cn('inline-flex items-center justify-center font-semibold', size === 'md' ? 'size-10 text-sm' : 'size-7 text-xs', shape.className)}>
        {label}
      </span>
      {status === 'answeredMarked' && <span className="absolute -bottom-0.5 -right-0.5 flex size-3.5 items-center justify-center rounded-full bg-[#3fa046] text-white ring-1 ring-white"><Check className="size-2.5" strokeWidth={4} /></span>}
    </span>
  );
}

export function StatusLegend({ responses }: { responses: QuestionResponse[] }) {
  const counts = countStatuses(responses);
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 text-xs text-[#333]">
      {(['answered', 'notAnswered', 'notVisited', 'marked'] as const).map((status) => (
        <div key={status} className="flex items-center gap-2"><StatusIcon status={status} label={counts[status]} size="sm" /> {statusLabel[status]}</div>
      ))}
      <div className="col-span-2 flex items-center gap-2"><StatusIcon status="answeredMarked" label={counts.answeredMarked} size="sm" /> {statusLabel.answeredMarked}</div>
    </div>
  );
}

export function PaletteGrid({ responses, current, onSelect, disabled }: { responses: QuestionResponse[]; current: number; onSelect: (index: number) => void; disabled?: boolean }) {
  return (
    <div className="grid grid-cols-5 gap-2.5">
      {responses.map((response, index) => (
        <button key={index} type="button" disabled={disabled} onClick={() => onSelect(index)} aria-label={`Question ${index + 1}, ${statusLabel[response.status]}`} className="flex justify-center disabled:cursor-not-allowed">
          <StatusIcon status={response.status} label={index + 1} current={index === current} />
        </button>
      ))}
    </div>
  );
}
