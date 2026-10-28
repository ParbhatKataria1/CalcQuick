'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FileText, HardDrive, Loader2, LogOut, Moon, RotateCcw, Sun, Trash2, UserRound, Volume2, VolumeX } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { useStats } from '@/context/stats-context';
import { useTheme } from '@/context/theme-context';
import { formatBytes, mockApi } from '@/lib/mock-api';
import { useLoad } from '@/lib/use-load';

export default function SettingsPage() {
  const { stats, toggleSound, resetProgress } = useStats();
  const { theme, setTheme } = useTheme();
  const { user, logOut } = useAuth();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div><div className="mb-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400">Preferences</div><h1 className="text-3xl font-bold tracking-tight">Settings</h1><p className="mt-2 text-slate-600 dark:text-slate-300">Your progress and mock tests are saved to your account, so they follow you to any device.</p></div>

      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"><UserRound className="size-5" /></div>
          <div>
            <div className="font-bold">{user?.name}</div>
            <div className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{user?.email}{user && ` · member since ${new Date(user.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}`}</div>
          </div>
        </div>
        <Button variant="outline" onClick={() => void logOut()}><LogOut className="size-4" /> Log out</Button>
      </Card>

      <Card className="divide-y divide-slate-100 dark:divide-slate-800">
        <div className="flex items-center justify-between gap-5 p-5">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {theme === 'dark' ? <Moon className="size-5" /> : <Sun className="size-5" />}
            </div>
            <div>
              <div className="font-bold">Appearance</div>
              <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">Choose the theme that is more comfortable for longer practice sessions. Saved on this device.</div>
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
        <div className="flex items-center justify-between gap-5 p-5"><div className="flex items-start gap-3"><div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{stats.soundEnabled ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}</div><div><div className="font-bold">Practice sounds</div><div className="mt-1 text-sm text-slate-500 dark:text-slate-400">Subtle feedback tones for correct and incorrect answers.</div></div></div><button onClick={toggleSound} aria-label="Toggle practice sounds" className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${stats.soundEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}><span className={`absolute top-1 size-5 rounded-full bg-white shadow transition-transform ${stats.soundEnabled ? 'left-6' : 'left-1'}`} /></button></div>
      </Card>

      <StorageSection onResetPractice={resetProgress} />
    </div>
  );
}

/** What the account stores, biggest items first, with a delete for each. */
function StorageSection({ onResetPractice }: { onResetPractice: () => Promise<void> }) {
  const { stats } = useStats();
  const usage = useLoad(() => mockApi.storageUsage(), 'storage');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (key: string, question: string, action: () => Promise<unknown> | void) => {
    if (!window.confirm(question)) return;
    setBusy(key);
    setError(null);
    try {
      await action();
      usage.reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(null);
    }
  };

  const data = usage.data;
  const sources = [...(data?.sources ?? [])].sort((a, b) => b.bytes - a.bytes);
  const attemptBytes = data?.attempts.reduce((sum, attempt) => sum + attempt.bytes, 0) ?? 0;
  const unstartedBytes = data?.unstartedTests.reduce((sum, test) => sum + test.bytes, 0) ?? 0;
  const total = (data?.practice.bytes ?? 0) + sources.reduce((sum, source) => sum + source.bytes, 0) + attemptBytes + unstartedBytes;

  return (
    <Card className="overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5 dark:border-slate-800">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"><HardDrive className="size-5" /></div>
          <div>
            <div className="font-bold">Storage</div>
            <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{data ? `${formatBytes(total)} used by your account.` : 'What your account stores.'} Uploaded papers take the most space.</div>
          </div>
        </div>
        {usage.loading && <Loader2 className="size-4 animate-spin text-slate-400" />}
      </div>
      {(error || usage.error) && <div className="bg-rose-50 px-5 py-2.5 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error ?? usage.error}</div>}

      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        <StorageRow
          title="Practice history"
          detail={`${stats.sessions.length} sessions · ${stats.answers.length} answers${data ? ` · ${formatBytes(data.practice.bytes)}` : ''}. Resets XP, streaks and personal bests too.`}
          action="Reset"
          icon={RotateCcw}
          busy={busy === 'practice'}
          onClick={() => run('practice', 'Reset all practice history, XP, streaks and personal bests?', onResetPractice)}
        />
        <StorageRow
          title="Mock test results"
          detail={`${data?.attempts.length ?? 0} attempts · ${formatBytes(attemptBytes)}`}
          action="Delete all"
          busy={busy === 'attempts'}
          disabled={!data?.attempts.length}
          onClick={() => run('attempts', 'Delete every mock test attempt and its result?', () => mockApi.clearStorage('attempts'))}
        />
        <StorageRow
          title="Generated tests never started"
          detail={`${data?.unstartedTests.length ?? 0} tests · ${formatBytes(unstartedBytes)}`}
          action="Delete"
          busy={busy === 'unstarted'}
          disabled={!data?.unstartedTests.length}
          onClick={() => run('unstarted', 'Delete tests that were generated but never started?', () => mockApi.clearStorage('unstartedTests'))}
        />
        {sources.map((source) => (
          <StorageRow
            key={source.id}
            title={<span className="inline-flex items-center gap-2"><FileText className="size-4 text-slate-400" /> <Link href={`/mock-tests/${source.id}`} className="hover:text-indigo-600">{source.name}</Link></span>}
            detail={`Paper · ${source.questions.quant + source.questions.reasoning + source.questions.english} questions · ${formatBytes(source.bytes)}`}
            action="Delete"
            busy={busy === source.id}
            onClick={() => run(source.id, `Delete "${source.name}" with all its tests and attempts?`, () => mockApi.deleteSource(source.id))}
          />
        ))}
      </div>
    </Card>
  );
}

function StorageRow({ title, detail, action, onClick, busy, disabled, icon: Icon = Trash2 }: { title: React.ReactNode; detail: string; action: string; onClick: () => void; busy?: boolean; disabled?: boolean; icon?: typeof Trash2 }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div className="min-w-0">
        <div className="truncate font-semibold">{title}</div>
        <div className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{detail}</div>
      </div>
      <Button variant="outline" size="sm" disabled={busy || disabled} onClick={onClick} className="shrink-0 text-rose-600 dark:text-rose-400">
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />} {action}
      </Button>
    </div>
  );
}
