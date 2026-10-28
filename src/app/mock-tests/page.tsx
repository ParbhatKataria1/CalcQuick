'use client';

import { useEffect, useRef, useState, type DragEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowRight, FileText, Loader2, ServerCrash, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/context/auth-context';
import { formatBytes, mockApi } from '@/lib/mock-api';
import { formatScore } from '@/lib/mock-scoring';
import { useLoad } from '@/lib/use-load';
import { cn } from '@/lib/utils';
import { SECTIONS, sectionLabel, type AttemptSummary, type SourceSummary } from '@/types/mock-test';

export default function MockTestsPage() {
  const sources = useLoad(() => mockApi.listSources(), 'sources');
  const attempts = useLoad(() => mockApi.listAttempts(), 'attempts');
  const serverDown = sources.error ?? attempts.error;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="rounded-3xl bg-slate-950 p-7 text-white md:p-10">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-300"><FileText className="size-6" /></div>
        <h1 className="mt-5 text-3xl font-bold tracking-tight">Mock Tests</h1>
        <p className="mt-3 max-w-2xl leading-7 text-slate-300">Upload a prelims paper as a PDF. Gemini reads it once; every test you generate after that has fresh numbers, names and passages for Quant, Reasoning and English, in the real IBPS / SBI exam interface.</p>
      </div>

      {serverDown ? (
        <Card className="flex items-start gap-4 border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/30">
          <ServerCrash className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <div>
            <div className="font-bold">Couldn&apos;t load your mock tests</div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{serverDown}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => { sources.reload(); attempts.reload(); }}>Try again</Button>
          </div>
        </Card>
      ) : (
        <UploadCard />
      )}

      <section>
        <h2 className="text-xl font-bold">Your papers</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Each paper can generate as many tests as you like.</p>
        {sources.loading ? <LoadingRow /> : sources.data?.length ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {sources.data.map((source) => <SourceCard key={source.id} source={source} onDeleted={sources.reload} />)}
          </div>
        ) : !sources.error && <Card className="mt-4 p-8 text-center text-sm text-slate-500 dark:text-slate-400">No papers yet. Upload a PDF to get started.</Card>}
      </section>

      {Boolean(attempts.data?.length) && (
        <section>
          <h2 className="text-xl font-bold">Recent attempts</h2>
          <Card className="mt-4 divide-y divide-slate-100 overflow-hidden dark:divide-slate-800">
            {attempts.data!.slice(0, 15).map((attempt) => <AttemptRow key={attempt.id} attempt={attempt} onDeleted={attempts.reload} />)}
          </Card>
        </section>
      )}
    </div>
  );
}

function UploadCard() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const { user } = useAuth();
  const [busy, setBusy] = useState<{ fileName: string; startedAt: number } | null>(null);
  const [uploaded, setUploaded] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!busy) return;
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - busy.startedAt) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [busy]);

  const upload = async (file: File | undefined) => {
    if (!file || busy) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Choose a PDF file.');
      return;
    }
    setError(null);
    setElapsed(0);
    setUploaded(0);
    setBusy({ fileName: file.name, startedAt: Date.now() });
    try {
      const { id } = await mockApi.uploadPdf(file, user!.id, setUploaded);
      router.push(`/mock-tests/${id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
      setBusy(null);
    }
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    void upload(event.dataTransfer.files[0]);
  };

  return (
    <Card className="p-5 md:p-7">
      <div
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn('flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition', dragging ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30' : 'border-slate-200 dark:border-slate-800')}
      >
        {busy ? (
          <>
            <Loader2 className="size-9 animate-spin text-indigo-600" />
            {uploaded < 100 ? (
              <>
                <div className="mt-4 font-bold">Uploading {busy.fileName}… {Math.round(uploaded)}%</div>
                <div className="mt-3 h-1.5 w-64 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${uploaded}%` }} /></div>
              </>
            ) : (
              <>
                <div className="mt-4 font-bold">Reading {busy.fileName}</div>
                <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">Gemini is extracting the questions and building templates for the calculation questions. A full paper takes 1–3 minutes. ({elapsed}s)</p>
              </>
            )}
          </>
        ) : (
          <>
            <div className="flex size-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300"><Upload className="size-6" /></div>
            <div className="mt-4 font-bold">Drop a mock test PDF here</div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Text-based PDFs up to 8 MB. An answer key in the PDF makes the answers more reliable.</p>
            <Button className="mt-5" onClick={() => inputRef.current?.click()}><Upload className="size-4" /> Choose PDF</Button>
            <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = ''; }} />
          </>
        )}
      </div>
      {error && <div className="mt-4 flex items-start gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"><AlertTriangle className="mt-0.5 size-4 shrink-0" /> {error}</div>}
    </Card>
  );
}

function SourceCard({ source, onDeleted }: { source: SourceSummary; onDeleted: () => void }) {
  const remove = async () => {
    if (!window.confirm(`Delete "${source.name}" with all its tests and attempts?`)) return;
    await mockApi.deleteSource(source.id);
    onDeleted();
  };
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-bold">{source.name}</h3>
          <div className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{source.fileName} · {new Date(source.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })} · {formatBytes(source.bytes)}</div>
        </div>
        <button onClick={remove} aria-label={`Delete ${source.name}`} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"><Trash2 className="size-4" /></button>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {SECTIONS.map((section) => (
          <div key={section} className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{sectionLabel[section].split(' ')[0]}</div>
            <div className="mt-0.5 font-bold">{source.questions[section]} <span className="text-xs font-medium text-slate-400">Qs</span></div>
          </div>
        ))}
      </div>
      <Link href={`/mock-tests/${source.id}`} className="mt-4 inline-flex items-center gap-2 self-start text-sm font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">Generate a test <ArrowRight className="size-4" /></Link>
    </Card>
  );
}

function AttemptRow({ attempt, onDeleted }: { attempt: AttemptSummary; onDeleted: () => void }) {
  const done = attempt.endedAt !== null;
  const remove = async () => {
    if (!window.confirm(`Delete this attempt at "${attempt.testName}"?`)) return;
    await mockApi.deleteAttempt(attempt.id);
    onDeleted();
  };
  return (
    <div className="flex items-center gap-2 pr-3 hover:bg-slate-50 dark:hover:bg-slate-800/50">
      <Link href={done ? `/mock-tests/result/${attempt.id}` : `/mock-tests/test/${attempt.testId}`} className="flex min-w-0 flex-1 items-center justify-between gap-4 px-5 py-4 text-sm">
        <div className="min-w-0">
          <div className="truncate font-semibold">{attempt.testName}</div>
          <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{new Date(attempt.startedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} · {formatBytes(attempt.bytes)}</div>
        </div>
        {done
          ? <div className="shrink-0 font-bold">{formatScore(attempt.score)} <span className="font-medium text-slate-400">/ {attempt.maxScore}</span></div>
          : <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">Resume</span>}
      </Link>
      <button onClick={remove} aria-label={`Delete attempt at ${attempt.testName}`} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"><Trash2 className="size-4" /></button>
    </div>
  );
}

function LoadingRow() {
  return <div className="mt-4 flex items-center gap-2 text-sm text-slate-500"><Loader2 className="size-4 animate-spin" /> Loading…</div>;
}
