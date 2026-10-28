import 'server-only';
import { TruncatedError, deleteGeminiFiles, extractQuestions, outlinePaper, pdfPartFor } from '@/lib/gemini';
import { HttpError } from '@/lib/server/http';
import { kv } from '@/lib/server/kv';
import { dropPdf, loadPdf } from '@/lib/server/pdf-store';
import { getSource, saveSource } from '@/lib/server/store';
import type { ImportState, MockSource, PaperBlock } from '@/types/mock-test';

/** Questions extracted per call: small enough that the answer is never cut off, with room for long passages. */
const QUESTIONS_PER_CHUNK = 15;
/** Only one step runs per paper at a time, so two open tabs can't read the same chunk twice. */
const STEP_LOCK_SECONDS = 290;

export type ImportProgress = { status: ImportState['status']; done: number; total: number; skipped: string[] };

/** Groups consecutive blocks into chunks of about QUESTIONS_PER_CHUNK questions, never splitting a block. */
export function chunkBlocks(blocks: PaperBlock[], size = QUESTIONS_PER_CHUNK): ImportState['chunks'] {
  const chunks: ImportState['chunks'] = [];
  for (const block of blocks) {
    const last = chunks[chunks.length - 1];
    if (last && block.to - last.from + 1 <= size) last.to = block.to;
    else chunks.push({ from: block.from, to: block.to, status: 'pending' });
  }
  return chunks;
}

const blocksIn = (state: ImportState, from: number, to: number) => (state.blocks ?? []).filter((block) => block.from >= from && block.to <= to);

export function importProgress(source: MockSource): ImportProgress {
  const state = source.importState;
  if (!state) return { status: 'ready', done: 0, total: 0, skipped: [] };
  // The outline counts as the first step.
  const total = 1 + state.chunks.length;
  const done = (state.blocks ? 1 : 0) + state.chunks.filter((chunk) => chunk.status !== 'pending').length;
  return { status: state.status, done, total, skipped: state.skipped ?? [] };
}

/** Deletes the stored PDF and its Gemini uploads; called when reading finishes or the paper is deleted. */
export async function cleanUpImport(state: ImportState | undefined) {
  if (!state) return;
  if (state.pdf) await dropPdf(state.pdf);
  if (state.geminiFiles) await deleteGeminiFiles(state.geminiFiles);
}

/**
 * Runs one step of reading a paper and saves the result: first the outline, then one chunk of
 * questions per call. Progress, the stored PDF and its Gemini uploads per API key live in the
 * paper's importState, so any failure (an exhausted key, overload, a time-out) resumes where it stopped.
 */
export async function runImportStep(userId: string, sourceId: string): Promise<ImportProgress> {
  let source = await getSource(userId, sourceId);
  if (source.importState?.status !== 'reading') return importProgress(source);

  const lockKey = `import-lock:${userId}:${sourceId}`;
  if (await kv.get(lockKey)) throw new HttpError('This paper is already being read in another tab. Wait a moment.', 409);
  await kv.set(lockKey, true, { ttlSeconds: STEP_LOCK_SECONDS });

  const state: ImportState = { ...source.importState, geminiFiles: { ...source.importState.geminiFiles } };
  if (!state.pdf) throw new HttpError('The uploaded PDF is missing. Delete this paper and upload it again.', 410);
  let pdf: Promise<Buffer> | null = null;
  const pdfPart = pdfPartFor(state.geminiFiles!, () => (pdf ??= loadPdf(state.pdf!)));
  let newSets: MockSource['sets'] = [];
  let name = source.name;

  try {
    if (!state.blocks) {
      const outline = await outlinePaper(pdfPart);
      state.blocks = outline.blocks;
      state.chunks = chunkBlocks(outline.blocks);
      if (outline.title) name = outline.title;
    } else {
      const index = state.chunks.findIndex((chunk) => chunk.status === 'pending');
      const chunk = state.chunks[index];
      if (chunk) {
        try {
          newSets = await extractQuestions(pdfPart, chunk.from, chunk.to);
          if (newSets.length) state.chunks[index] = { ...chunk, status: 'done' };
          else {
            state.chunks[index] = { ...chunk, status: 'failed' };
            state.skipped = [...(state.skipped ?? []), `Questions ${chunk.from}–${chunk.to}: nothing could be read`];
          }
        } catch (error) {
          if (!(error instanceof TruncatedError)) throw error;
          // Too much for one answer: split the chunk in half by blocks; a single block that's still too long is skipped.
          const blocks = blocksIn(state, chunk.from, chunk.to);
          if (blocks.length > 1) {
            const half = Math.ceil(blocks.length / 2);
            const parts = [blocks.slice(0, half), blocks.slice(half)].map((items) => ({ from: items[0].from, to: items[items.length - 1].to, status: 'pending' as const }));
            state.chunks.splice(index, 1, ...parts);
          } else {
            state.chunks[index] = { ...chunk, status: 'failed' };
            state.skipped = [...(state.skipped ?? []), `Questions ${chunk.from}–${chunk.to}: too long to read in one go`];
          }
        }
      }
    }

    if (state.blocks && state.chunks.every((chunk) => chunk.status !== 'pending')) {
      await cleanUpImport(state);
      state.status = 'ready';
      delete state.pdf;
      delete state.geminiFiles;
    }
  } finally {
    // Saved even when the step fails, so Gemini uploads made for a key are reused on the next try.
    const latest = await getSource(userId, sourceId).catch(() => null);
    if (latest) {
      source = await saveSource(userId, { ...latest, name: latest.name === source.name ? name : latest.name, sets: [...latest.sets, ...newSets], importState: state });
    }
    await kv.del(lockKey);
  }
  return importProgress(source);
}
