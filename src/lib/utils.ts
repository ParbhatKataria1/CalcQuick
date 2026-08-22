export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export const formatSeconds = (milliseconds: number | null | undefined) => {
  if (!milliseconds && milliseconds !== 0) return '—';
  return `${(milliseconds / 1000).toFixed(1)}s`;
};

export const formatPercent = (value: number) => `${Math.round(value)}%`;
