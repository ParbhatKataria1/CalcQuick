'use client';

import { Database, Moon, RotateCcw, Sun, Volume2, VolumeX } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useStats } from '@/context/stats-context';
import { useTheme } from '@/context/theme-context';

export default function SettingsPage() {
  const { stats, toggleSound, resetProgress } = useStats();
  const { theme, setTheme } = useTheme();
  const confirmReset = () => {
    if (window.confirm('Reset all local practice history, XP, streaks and personal bests?')) resetProgress();
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div><div className="mb-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400">Preferences</div><h1 className="text-3xl font-bold tracking-tight">Settings</h1><p className="mt-2 text-slate-600 dark:text-slate-300">The MVP stores your progress locally in this browser. No account or external credentials are required.</p></div>
      <Card className="divide-y divide-slate-100 dark:divide-slate-800">
        <div className="flex items-center justify-between gap-5 p-5">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {theme === 'dark' ? <Moon className="size-5" /> : <Sun className="size-5" />}
            </div>
            <div>
              <div className="font-bold">Appearance</div>
              <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">Choose the theme that is more comfortable for longer practice sessions.</div>
            </div>
          </div>
          <div className="flex shrink-0 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${theme === 'light' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-950 dark:text-slate-400'}`}
            >
              <Sun className="size-3.5" /> <span className="hidden sm:inline">Light</span>
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${theme === 'dark' ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'}`}
            >
              <Moon className="size-3.5" /> <span className="hidden sm:inline">Dark</span>
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between gap-5 p-5"><div className="flex items-start gap-3"><div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{stats.soundEnabled ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}</div><div><div className="font-bold">Practice sounds</div><div className="mt-1 text-sm text-slate-500 dark:text-slate-400">Subtle feedback tones for correct and incorrect answers.</div></div></div><button onClick={toggleSound} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${stats.soundEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}><span className={`absolute top-1 size-5 rounded-full bg-white shadow transition-transform ${stats.soundEnabled ? 'left-6' : 'left-1'}`} /></button></div>
        <div className="flex items-start gap-3 p-5"><div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"><Database className="size-5" /></div><div><div className="font-bold">Local storage</div><div className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">Sessions, answers, XP, weak topics and personal bests remain in this browser&apos;s localStorage. The data layer is isolated so a Firebase backend can replace it later.</div></div></div>
      </Card>
      <Card className="border-rose-200 dark:border-rose-900 p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-bold text-rose-700 dark:text-rose-300">Reset progress</div><div className="mt-1 text-sm text-slate-500 dark:text-slate-400">Delete all local practice history and start again from zero.</div></div><Button variant="danger" onClick={confirmReset}><RotateCcw className="size-4" /> Reset all data</Button></div></Card>
    </div>
  );
}
