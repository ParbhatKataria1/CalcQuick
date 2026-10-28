import { UserRound } from 'lucide-react';

export function ExamHeader({ title, candidate, timer }: { title: string; candidate: string; timer?: React.ReactNode }) {
  return (
    <header className="flex items-center justify-between gap-4 bg-[#1f4e8c] px-4 py-2 text-white">
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-blue-200">CalcSprint Online Examination</div>
        <div className="truncate text-sm font-bold sm:text-base">{title}</div>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        {timer}
        <div className="hidden items-center gap-2 sm:flex">
          <div className="flex size-9 items-center justify-center rounded bg-white/15"><UserRound className="size-5" /></div>
          <div className="text-xs leading-4"><div className="text-blue-200">Candidate Name</div><div className="font-semibold">{candidate}</div></div>
        </div>
      </div>
    </header>
  );
}
