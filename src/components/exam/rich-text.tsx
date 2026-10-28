import type { ReactNode } from 'react';
import { decodeEscapes } from '@/lib/math-text';
import { cn } from '@/lib/utils';

const isTableLine = (line: string) => line.trim().startsWith('|');
const cells = (line: string) => line.trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim());
const isDivider = (line: string) => /^\|?[\s:|-]+\|?$/.test(line.trim()) && line.includes('-');

/**
 * Powers written as x^2, x^? or (512)^(1/3) become superscripts, and simple fractions such as 3/4
 * (up to 3 digits, so years like 2024/25 stay as written) are stacked, so questions read as printed in the exam.
 */
const MATH = /\^\(([^()]*(?:\([^()]*\)[^()]*)*)\)|\^(-?\d+(?:\.\d+)?|[a-z?])|(?<![\w./])(\d{1,3})\/(\d{1,3})(?![\w./])/gi;

function renderMath(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(MATH)) {
    const index = match.index ?? 0;
    if (index > last) nodes.push(text.slice(last, index));
    const [, groupedPower, simplePower, numerator, denominator] = match;
    if (numerator !== undefined) {
      nodes.push(
        <span key={index} className="mx-0.5 inline-flex flex-col items-center align-middle text-[0.75em] leading-none">
          <span className="px-0.5">{numerator}</span>
          <span className="w-full border-t border-current px-0.5 pt-px">{denominator}</span>
        </span>,
      );
    } else {
      nodes.push(<sup key={index}>{renderMath(groupedPower ?? simplePower ?? '')}</sup>);
    }
    last = index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/** Question text as the AI writes it: paragraphs and line breaks, maths notation, and DI data as markdown tables. */
export function RichText({ text, className }: { text: string; className?: string }) {
  const blocks: Array<{ type: 'text' | 'table'; lines: string[] }> = [];
  for (const line of decodeEscapes(text).split('\n')) {
    const type = isTableLine(line) ? 'table' : 'text';
    const last = blocks[blocks.length - 1];
    if (last?.type === type) last.lines.push(line);
    else blocks.push({ type, lines: [line] });
  }

  return (
    <div className={cn('space-y-3', className)}>
      {blocks.map((block, index) => {
        if (block.type === 'text') {
          const content = block.lines.join('\n').trim();
          return content ? <p key={index} className="whitespace-pre-wrap">{renderMath(content)}</p> : null;
        }
        const rows = block.lines.filter((line) => !isDivider(line)).map(cells);
        const [head, ...body] = rows;
        return (
          <div key={index} className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead><tr>{head.map((cell, cellIndex) => <th key={cellIndex} className="border border-slate-400/40 bg-slate-500/10 px-3 py-1.5 text-left font-semibold">{renderMath(cell)}</th>)}</tr></thead>
              <tbody>{body.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex} className="border border-slate-400/40 px-3 py-1.5">{renderMath(cell)}</td>)}</tr>)}</tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
