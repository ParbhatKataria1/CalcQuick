import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Calculator,
  CheckCircle2,
  Clock3,
  Flame,
  Gauge,
  LineChart,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';
import { LandingThemeToggle } from '@/components/landing-theme-toggle';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  title: { absolute: 'CalcSprint — Free Banking Exam Calculation Practice for SBI & IBPS' },
  description:
    'Practice fast mental calculations for SBI, IBPS and RRB banking exams. Train tables, squares, cubes, fractions, percentages, multiplication, division and speed drills with CalcSprint.',
  keywords: [
    'banking exam calculation practice',
    'SBI Clerk quantitative aptitude',
    'IBPS Clerk calculation practice',
    'RRB Clerk quant practice',
    'mental maths for bank exams',
    'calculation speed practice',
    'bank exam simplification practice',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: siteUrl,
    title: 'CalcSprint — Banking Exam Calculation Trainer',
    description:
      'Build calculation speed and accuracy for SBI, IBPS and RRB exams with timed drills, adaptive practice and progress tracking.',
    siteName: 'CalcSprint',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CalcSprint — Banking Exam Calculation Trainer',
    description: 'Free mental calculation practice for SBI, IBPS and RRB banking exams.',
  },
};

const practiceAreas = [
  ['Tables', '1–30 multiplication tables for fast recall.'],
  ['Squares', 'Perfect squares from 1² to 40².'],
  ['Cubes', 'Cubes from 1³ to 20³.'],
  ['Fractions & percentages', 'Convert common fractions and percentages mentally.'],
  ['Square roots', 'Perfect square roots up to 2500.'],
  ['Addition & subtraction', 'Build faster number handling without long written steps.'],
  ['Multiplication', 'Practice common 2-digit × 2-digit calculations.'],
  ['Division', 'Train exact division and useful banking-exam number patterns.'],
];

const faqs = [
  {
    question: 'Is CalcSprint useful for SBI and IBPS Clerk preparation?',
    answer:
      'Yes. CalcSprint focuses on calculation speed and accuracy that support Quantitative Aptitude topics used in SBI, IBPS and RRB clerical exams, including simplification, approximation, percentages and data interpretation.',
  },
  {
    question: 'What should I memorize before using the speed drills?',
    answer:
      'A strong base includes tables up to 30, squares up to 40, cubes up to 20, common fraction-percentage conversions, powers of 2 and perfect square roots. You can still practice while learning these values.',
  },
  {
    question: 'Does the app require an account?',
    answer:
      'No account is required in this version. Practice progress, XP, streaks and performance statistics are stored locally in your browser.',
  },
  {
    question: 'Can I practice on mobile?',
    answer:
      'Yes. The trainer is responsive and the practice flow is designed to work on desktop, tablet and mobile devices.',
  },
];

export default function HomePage() {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };

  const webAppSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'CalcSprint',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    url: siteUrl,
    description:
      'A calculation speed and accuracy trainer for SBI, IBPS and RRB banking exam preparation.',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
  };

  return (
    <div className="min-h-screen bg-white text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppSchema) }} />

      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/90">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="CalcSprint home">
            <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <Calculator className="size-5" />
            </span>
            <span>
              <span className="block font-bold tracking-tight">CalcSprint</span>
              <span className="hidden text-[11px] font-medium text-slate-500 dark:text-slate-400 sm:block">Banking Quant Trainer</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-600 dark:text-slate-300 md:flex" aria-label="Primary navigation">
            <a href="#features" className="hover:text-slate-950 dark:hover:text-white">Features</a>
            <a href="#practice" className="hover:text-slate-950 dark:hover:text-white">Practice areas</a>
            <a href="#how-it-works" className="hover:text-slate-950 dark:hover:text-white">How it works</a>
            <a href="#faq" className="hover:text-slate-950 dark:hover:text-white">FAQ</a>
          </nav>

          <div className="flex items-center gap-2">
            <LandingThemeToggle />
            <Link href="/login" className="hidden rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900 sm:inline-flex">Log in</Link>
            <Link href="/practice" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700">Start Practice <ArrowRight className="size-4" /></Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-slate-100 dark:border-slate-900">
          <div className="absolute inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.14),_transparent_58%)] dark:bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.18),_transparent_58%)]" />
          <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 md:py-28 lg:grid-cols-[1.08fr_.92fr] lg:items-center lg:px-8 lg:py-32">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-300">
                <Sparkles className="size-3.5" /> Built for SBI • IBPS • RRB preparation
              </div>
              <h1 className="mt-6 max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Improve your calculation speed for banking exams.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
                Practice mental maths with timed drills for tables, squares, cubes, fractions, percentages, multiplication, division and the calculations that appear repeatedly in banking Quantitative Aptitude.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/practice" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-indigo-700">
                  Start free practice <ArrowRight className="size-4" />
                </Link>
                <Link href="/speed?duration=300" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-800 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
                  <Zap className="size-4" /> Try 5-minute speed drill
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-2"><CheckCircle2 className="size-4 text-emerald-500" /> No account required</span>
                <span className="flex items-center gap-2"><CheckCircle2 className="size-4 text-emerald-500" /> Progress saved locally</span>
                <span className="flex items-center gap-2"><CheckCircle2 className="size-4 text-emerald-500" /> Light & dark mode</span>
              </div>
            </div>

            <div className="relative">
              <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-2xl shadow-indigo-100/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none sm:p-7">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">Speed drill</div>
                    <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">Mental multiplication</div>
                  </div>
                  <div className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">🔥 8 streak</div>
                </div>
                <div className="my-10 text-center">
                  <div className="text-sm font-semibold text-slate-400">Question 14 of 30</div>
                  <div className="mt-5 text-5xl font-bold tracking-tight sm:text-6xl">24 × 17 = ?</div>
                  <div className="mx-auto mt-7 max-w-xs rounded-2xl border-2 border-indigo-200 bg-indigo-50/60 px-5 py-4 text-left text-2xl font-bold text-slate-400 dark:border-indigo-900 dark:bg-indigo-950/30">408</div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <MiniMetric icon={Clock3} label="Avg time" value="3.8s" />
                  <MiniMetric icon={Target} label="Accuracy" value="94%" />
                  <MiniMetric icon={Trophy} label="XP" value="+165" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Train what matters" title="Speed, accuracy and consistency in one practice loop" description="CalcSprint turns basic calculation recall into repeatable timed practice, then uses your results to show what deserves more attention." />
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <Feature icon={Gauge} title="Timed speed challenges" text="Choose 1, 2, 5 or 10-minute drills and track questions per minute, response time and streaks." />
            <Feature icon={Target} title="Weak-area training" text="Practice more frequently from categories where your accuracy is lower or your response time is slower." />
            <Feature icon={LineChart} title="Performance tracking" text="See accuracy, response time, daily activity, category performance and personal bests." />
            <Feature icon={Flame} title="Motivating progression" text="Build practice streaks, earn XP, unlock levels and complete a focused daily challenge." />
          </div>
        </section>

        <section id="practice" className="border-y border-slate-100 bg-slate-50 dark:border-slate-900 dark:bg-slate-900/40">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <SectionHeading eyebrow="Calculation foundation" title="Practice the number facts you want to recall automatically" description="Use focused categories when learning, then switch to mixed and banking drills when you want exam-style calculation pressure." />
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {practiceAreas.map(([title, text]) => (
                <div key={title} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400"><Calculator className="size-4" /></div>
                  <h3 className="mt-4 font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[.85fr_1.15fr] lg:items-start">
            <div>
              <div className="text-sm font-bold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">How it works</div>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Make basic calculations cheaper in exam time.</h2>
              <p className="mt-5 text-base leading-7 text-slate-600 dark:text-slate-300">When tables, percentages and common number patterns take less mental effort, you can spend more of the exam on interpreting the actual Quant question instead of getting stuck on arithmetic.</p>
              <Link href="/banking-drill" className="mt-7 inline-flex items-center gap-2 font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">Open Banking Drill <ArrowRight className="size-4" /></Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Step number="01" title="Choose a category" text="Train one skill or pick mixed practice." />
              <Step number="02" title="Solve against time" text="Use keyboard-first answer entry and immediate feedback." />
              <Step number="03" title="Review the data" text="Repeat mistakes and spend more time on weak areas." />
            </div>
          </div>
        </section>

        <section className="border-y border-slate-100 bg-slate-950 text-white dark:border-slate-800">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8">
            <Impact icon={Zap} title="Simplification & approximation" text="Faster arithmetic helps reduce the time spent manipulating numbers." />
            <Impact icon={BarChart3} title="Data Interpretation" text="Quicker percentages, ratios and division make DI calculations easier to execute under pressure." />
            <Impact icon={Calculator} title="Arithmetic chapters" text="Mental number fluency supports percentage, profit & loss, averages, ratio, interest and related topics." />
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="FAQ" title="Banking calculation practice questions" description="A few common questions about using CalcSprint as part of your Quant preparation." centered />
          <div className="mt-10 space-y-4">
            {faqs.map((item) => (
              <details key={item.question} className="group rounded-2xl border border-slate-200 bg-white p-5 open:shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <summary className="cursor-pointer list-none font-bold marker:hidden">{item.question}</summary>
                <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-3xl bg-indigo-600 px-6 py-12 text-white sm:px-10 md:flex md:items-center md:justify-between md:gap-8">
            <div>
              <div className="text-sm font-bold uppercase tracking-[0.18em] text-indigo-100">Start training</div>
              <h2 className="mt-2 text-3xl font-bold tracking-tight">Turn calculation recall into a daily habit.</h2>
              <p className="mt-3 max-w-2xl text-indigo-100">Start with a short practice round, then use your dashboard to decide what to train next.</p>
            </div>
            <Link href="/practice" className="mt-6 inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-5 py-3 font-bold text-indigo-700 transition hover:bg-indigo-50 md:mt-0">Start Practice <ArrowRight className="size-4" /></Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-slate-500 dark:text-slate-400 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>© {new Date().getFullYear()} CalcSprint. Banking calculation practice trainer.</div>
          <div className="flex flex-wrap gap-5">
            <Link href="/practice" className="hover:text-slate-950 dark:hover:text-white">Practice</Link>
            <Link href="/speed" className="hover:text-slate-950 dark:hover:text-white">Speed Challenge</Link>
            <Link href="/banking-drill" className="hover:text-slate-950 dark:hover:text-white">Banking Drill</Link>
            <Link href="/dashboard" className="hover:text-slate-950 dark:hover:text-white">Dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SectionHeading({ eyebrow, title, description, centered = false }: { eyebrow: string; title: string; description: string; centered?: boolean }) {
  return (
    <div className={centered ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'}>
      <div className="text-sm font-bold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">{eyebrow}</div>
      <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">{description}</p>
    </div>
  );
}

function MiniMetric({ icon: Icon, label, value }: { icon: typeof Clock3; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-800/70">
      <Icon className="mx-auto size-4 text-indigo-600 dark:text-indigo-400" />
      <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 font-bold">{value}</div>
    </div>
  );
}

function Feature({ icon: Icon, title, text }: { icon: typeof Gauge; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex size-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400"><Icon className="size-5" /></div>
      <h3 className="mt-5 text-lg font-bold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{text}</p>
    </div>
  );
}

function Step({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
      <div className="text-xs font-black tracking-[0.2em] text-indigo-600 dark:text-indigo-400">{number}</div>
      <h3 className="mt-5 font-bold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{text}</p>
    </div>
  );
}

function Impact({ icon: Icon, title, text }: { icon: typeof Zap; title: string; text: string }) {
  return (
    <div>
      <div className="flex size-10 items-center justify-center rounded-xl bg-white/10 text-indigo-300"><Icon className="size-5" /></div>
      <h3 className="mt-5 text-lg font-bold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-300">{text}</p>
    </div>
  );
}
