import type { Metadata } from 'next';
import './globals.css';
import { StatsProvider } from '@/context/stats-context';
import { ThemeProvider } from '@/context/theme-context';
import { AppShell } from '@/components/app-shell';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'CalcSprint — Banking Calculation Trainer',
    template: '%s | CalcSprint',
  },
  description: 'Improve calculation speed and accuracy for SBI, IBPS and RRB banking exams.',
  applicationName: 'CalcSprint',
  category: 'education',
};

const themeScript = `(function(){try{var t=localStorage.getItem('calcsprint-theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);document.documentElement.dataset.theme=d?'dark':'light';document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeProvider>
          <StatsProvider>
            <AppShell>{children}</AppShell>
          </StatsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
