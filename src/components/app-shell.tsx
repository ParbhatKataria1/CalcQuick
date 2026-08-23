'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  BookOpen,
  Calculator,
  Flame,
  Gauge,
  Home,
  Medal,
  Menu,
  Moon,
  Settings,
  Sparkles,
  Sun,
  Target,
  Trophy,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { getLevel } from '@/lib/stats';
import { useStats } from '@/context/stats-context';
import { useTheme } from '@/context/theme-context';

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/practice', label: 'Practice', icon: Calculator },
  { href: '/speed', label: 'Speed Challenge', icon: Gauge },
  { href: '/banking-drill', label: 'Banking Drill', icon: Sparkles },
  { href: '/banking-method', label: 'Banking Method', icon: BookOpen },
  { href: '/daily-challenge', label: 'Daily Challenge', icon: Target },
  { href: '/mistakes', label: 'Mistakes', icon: Flame },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/achievements', label: 'Achievements', icon: Trophy },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { stats } = useStats();
  const { theme, toggleTheme } = useTheme();
  const level = getLevel(stats.xp);

  if (pathname === '/') return <>{children}</>;

  const sidebar = (
    <>
      <div className="flex h-18 items-center gap-3 border-b border-slate-200 dark:border-slate-800 px-5">
        <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
          <Calculator className="size-5" />
        </div>
        <div>
          <div className="font-bold tracking-tight text-slate-950 dark:text-slate-50">CalcSprint</div>
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Banking Quant Trainer</div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {nav.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                active ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-white',
              )}
            >
              <Icon className="size-[18px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4">
        <div className="rounded-2xl bg-slate-950 p-4 text-white">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <Medal className="size-4" /> Level {level.level}
          </div>
          <div className="mt-1 text-sm font-bold">{level.name}</div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-indigo-400 transition-all" style={{ width: `${level.progress}%` }} />
          </div>
          <div className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">{stats.xp.toLocaleString()} XP</div>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-950 dark:text-slate-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 lg:flex">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="Close menu" className="absolute inset-0 bg-slate-950/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[86%] max-w-72 flex-col bg-white dark:bg-slate-900 shadow-2xl">
            <button className="absolute right-3 top-3 z-10 rounded-lg p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setOpen(false)}>
              <X className="size-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 px-4 backdrop-blur md:px-7 lg:px-8">
          <button className="rounded-xl p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden" onClick={() => setOpen(true)}>
            <Menu className="size-5" />
          </button>
          <div className="hidden text-sm font-medium text-slate-500 dark:text-slate-400 sm:block">Speed • Accuracy • Consistency</div>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 sm:flex">
              <Flame className="size-4" /> {stats.currentStreakDays} day streak
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
            >
              {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            <div className="flex size-9 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-sm font-bold text-indigo-700 dark:text-indigo-300">P</div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1500px] p-4 md:p-7 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
