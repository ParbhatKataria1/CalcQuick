import { cn } from '@/lib/utils';

const isTableLine = (line: string) => line.trim().startsWith('|');
const cells = (line: string) => line.trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim());
const isDivider = (line: string) => /^\|?[\s:|-]+\|?$/.test(line.trim()) && line.includes('-');

/** Question text as the AI writes it: paragraphs and line breaks, with DI data as markdown tables. */
export function RichText({ text, className }: { text: string; className?: string }) {
  const blocks: Array<{ type: 'text' | 'table'; lines: string[] }> = [];
  for (const line of text.split('\n')) {
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
          return content ? <p key={index} className="whitespace-pre-wrap">{content}</p> : null;
        }
        const rows = block.lines.filter((line) => !isDivider(line)).map(cells);
        const [head, ...body] = rows;
        return (
          <div key={index} className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead><tr>{head.map((cell, cellIndex) => <th key={cellIndex} className="border border-slate-400/40 bg-slate-500/10 px-3 py-1.5 text-left font-semibold">{cell}</th>)}</tr></thead>
              <tbody>{body.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex} className="border border-slate-400/40 px-3 py-1.5">{cell}</td>)}</tr>)}</tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
