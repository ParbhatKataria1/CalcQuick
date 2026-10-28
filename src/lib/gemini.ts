import 'server-only';
import { ApiError, FileState, FinishReason, createPartFromUri, type PartUnion } from '@google/genai';
import { OUTLINE_PROMPT, REVIEW_PROMPT, VARIANTS_PROMPT, chunkPrompt, extractionSchema, outlineSchema, reviewSchema, variantsSchema } from '@/lib/gemini-prompt';
import { geminiKeys, withGeminiKey, type GeminiKey } from '@/lib/server/gemini-keys';
import { decodeEscapes, wordCount } from '@/lib/math-text';
import { optionSpreadOf, templateWorks, uid } from '@/lib/mock-generator';
import { HttpError } from '@/lib/server/http';
import { SECTIONS, type Difficulty, type ImportState, type PaperBlock, type QuestionSet, type QuestionTemplate, type Section, type SetContent, type StaticQuestion } from '@/types/mock-test';

export const VARIANTS_PER_SET = 2;
/** Sets the browser sends per request; with the review pass this stays well inside the 300 s function limit. */
export const VARIANT_SETS_PER_REQUEST = 3;

/** Gemini's answer hit the output limit; the caller should ask for less at once. */
export class TruncatedError extends HttpError {
  constructor() {
    super('Gemini\'s answer was too long and got cut off.', 502);
  }
}

/** Waits before each retry while Gemini is overloaded; keeps the whole call well inside the 300 s function limit. */
const RETRY_DELAYS_MS = [3000, 8000];
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
/** The most the models will write in one answer; asking for it avoids early cut-offs. */
const MAX_OUTPUT_TOKENS = 65_536;

/** Overloaded (503), internal (500) and gateway errors are usually brief, so they are worth retrying. */
const isTemporary = (error: unknown) => error instanceof ApiError && [500, 502, 503, 504].includes(error.status);

const models = () => [...new Set([process.env.GEMINI_MODEL || 'gemini-flash-latest', process.env.GEMINI_FALLBACK_MODEL || 'gemini-flash-lite-latest'])];

/** Parts of a request; a function when they depend on the key (an uploaded PDF belongs to one key). */
type Parts = PartUnion[] | ((key: GeminiKey) => Promise<PartUnion[]>);

/** Google's answer when an uploaded file has expired, was deleted or belongs to another key; not a problem with the key. */
const isFileError = (error: unknown) => error instanceof ApiError && [400, 403, 404].includes(error.status) && /\bfile\b/i.test(error.message ?? '');

/**
 * One Gemini request that returns JSON. Key problems (quota, revoked key) move it to the next key;
 * overload retries the model and then the lighter fallback model; a cut-off answer throws TruncatedError.
 */
async function generateJson<T>(parts: Parts, schema: object, onFileError?: (key: GeminiKey) => void): Promise<T> {
  let text: string | undefined;
  try {
    text = await withGeminiKey(async (key) => {
      try {
        return await requestWithKey(key);
      } catch (error) {
        if (!onFileError || !isFileError(error)) throw error;
        // The PDF upload is gone or not this key's: upload it again for this key and retry once.
        onFileError(key);
        return requestWithKey(key);
      }
    });
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (isTemporary(error)) throw new HttpError('Gemini is overloaded right now (this is on Google\'s side). Wait a few minutes and try again; your progress is saved.', 503);
    if (error instanceof ApiError && error.status === 400) throw new HttpError(`Gemini rejected the request: ${error.message}`, 400);
    throw new HttpError(`Gemini request failed: ${error instanceof Error ? error.message : String(error)}`, 502);
  }
  if (!text) throw new HttpError('Gemini returned an empty response. Try again.', 502);
  try {
    return JSON.parse(text) as T;
  } catch {
    // A JSON answer that doesn't parse almost always stopped early.
    throw new TruncatedError();
  }

  async function requestWithKey(key: GeminiKey) {
    const contents = [{ role: 'user', parts: (typeof parts === 'function' ? await parts(key) : parts).map((part) => (typeof part === 'string' ? { text: part } : part)) }];
    // Retry the main model a couple of times, then try the lighter fallback model once.
    const plan = [...[0, ...RETRY_DELAYS_MS].map((delay) => ({ model: models()[0], delay })), ...models().slice(1).map((model) => ({ model, delay: 0 }))];
    let lastError: unknown;
    for (const { model, delay } of plan) {
      if (delay) await sleep(delay);
      try {
        const response = await key.client.models.generateContent({
          model,
          contents,
          config: { responseMimeType: 'application/json', responseJsonSchema: schema, temperature: 0.4, maxOutputTokens: MAX_OUTPUT_TOKENS },
        });
        if (response.candidates?.[0]?.finishReason === FinishReason.MAX_TOKENS) throw new TruncatedError();
        return response.text;
      } catch (error) {
        lastError = error;
        if (!isTemporary(error)) throw error;
      }
    }
    throw lastError;
  }
}

/** How long to wait for Gemini to finish processing an uploaded PDF. */
const FILE_READY_TIMEOUT_MS = 120_000;
/** Re-upload a file this close to its 48-hour expiry rather than risk it vanishing mid-call. */
const FILE_EXPIRY_MARGIN_MS = 30 * 60_000;

export type GeminiFiles = NonNullable<ImportState['geminiFiles']>;

/**
 * The paper as a request part for this key. The PDF is uploaded to Gemini once per key (files are only
 * visible to the key that uploaded them) and the handle is kept in `files`, which the caller saves, so
 * later steps and other keys reuse or re-create it from the stored PDF.
 */
export function pdfPartFor(files: GeminiFiles, loadPdf: () => Promise<Buffer>) {
  const part = async (key: GeminiKey): Promise<PartUnion> => {
    const cached = files[key.id];
    if (cached && cached.expiresAt - FILE_EXPIRY_MARGIN_MS > Date.now()) return createPartFromUri(cached.uri, 'application/pdf');
    const bytes = await loadPdf();
    let file = await key.client.files.upload({ file: new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }), config: { mimeType: 'application/pdf', displayName: 'paper.pdf' } });
    const started = Date.now();
    while (file.state === FileState.PROCESSING && file.name && Date.now() - started < FILE_READY_TIMEOUT_MS) {
      await sleep(2000);
      file = await key.client.files.get({ name: file.name });
    }
    if (file.state !== FileState.ACTIVE || !file.uri || !file.name) throw new HttpError('Gemini could not process this PDF. Is it password-protected or damaged?', 422);
    files[key.id] = { name: file.name, uri: file.uri, expiresAt: file.expirationTime ? Date.parse(file.expirationTime) : Date.now() + 47 * 60 * 60_000 };
    return createPartFromUri(file.uri, 'application/pdf');
  };
  /** Drops a key's cached upload, so the next request uploads the PDF again. */
  const forget = (key: GeminiKey) => { delete files[key.id]; };
  return Object.assign(part, { forget });
}

/** Removes the paper's uploads from Gemini once it has been read; they would expire after 48 h anyway. */
export async function deleteGeminiFiles(files: GeminiFiles) {
  const keys = geminiKeys();
  await Promise.all(Object.entries(files).map(([keyId, file]) => keys.find((key) => key.id === keyId)?.client.files.delete({ name: file.name }).catch(() => undefined)));
}

const asString = (value: unknown) => (typeof value === 'string' ? decodeEscapes(value).trim() : '');

function cleanQuestion(raw: unknown): StaticQuestion | null {
  const value = raw as Partial<StaticQuestion> | null;
  const options = Array.isArray(value?.options) ? value.options.map(asString).filter(Boolean) : [];
  const answerIndex = Number(value?.answerIndex);
  const text = asString(value?.text);
  if (!text || options.length < 2 || !Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= options.length) return null;
  return { text, options, answerIndex, explanation: asString(value?.explanation) };
}

function cleanContent(raw: unknown): SetContent | null {
  const value = raw as { passage?: unknown; questions?: unknown[] } | null;
  const questions = (value?.questions ?? []).map(cleanQuestion);
  if (!questions.length || questions.some((question) => !question)) return null;
  return { passage: asString(value?.passage) || undefined, questions: questions as StaticQuestion[] };
}

const NAME = /^[a-z_][a-z0-9_]*$/i;

function cleanTemplate(raw: unknown, originalQuestion: StaticQuestion): QuestionTemplate | null {
  const value = raw as Partial<QuestionTemplate> | null;
  const variables = (Array.isArray(value?.variables) ? value.variables : [])
    .map((variable) => {
      const original = Number(variable?.value);
      return { name: asString(variable?.name), min: Number(variable?.min), max: Number(variable?.max), step: Number(variable?.step) || 1, value: Number.isFinite(original) ? original : undefined };
    })
    .filter((variable) => NAME.test(variable.name) && Number.isFinite(variable.min) && Number.isFinite(variable.max) && variable.max >= variable.min);
  if (!value || !variables.length || !asString(value.answerExpr)) return null;
  const derived = (Array.isArray(value.derived) ? value.derived : [])
    .map((item) => ({ name: asString(item?.name), expr: asString(item?.expr) }))
    .filter((item) => NAME.test(item.name) && item.expr);
  return {
    text: asString(value.text),
    variables,
    derived: derived.length ? derived : undefined,
    answerExpr: asString(value.answerExpr),
    distractorExprs: Array.isArray(value.distractorExprs) ? value.distractorExprs.map(asString).filter(Boolean) : [],
    answerFormat: value.answerFormat === 'decimal2' ? 'decimal2' : 'integer',
    optionFormat: asString(value.optionFormat) || '{value}',
    explanation: asString(value.explanation),
    optionSpread: optionSpreadOf(originalQuestion),
  };
}

type ExtractedSet = { section?: unknown; topic?: unknown; difficulty?: unknown; passage?: unknown; questions?: unknown[]; templates?: unknown[] };

const DIFFICULTIES: Difficulty[] = ['easy', 'moderate', 'hard'];

/**
 * Turns extracted sets into question sets. A calculation set keeps its templates only if each one gives
 * the original's answer when fed the original numbers, and keeps producing valid questions; otherwise
 * it gets AI-written versions like every other set.
 */
function toQuestionSets(rawSets: ExtractedSet[]): QuestionSet[] {
  const sets: QuestionSet[] = [];
  for (const raw of rawSets) {
    const original = cleanContent(raw);
    if (!original) continue;
    const section: Section = SECTIONS.includes(raw.section as Section) ? (raw.section as Section) : 'quant';
    const templates = (raw.templates ?? []).map((template, index) => (original.questions[index] ? cleanTemplate(template, original.questions[index]) : null));
    const usable = section === 'quant' && templates.length === original.questions.length &&
      templates.every((template, index) => template && templateWorks(template, original.questions[index]));
    sets.push({
      id: uid('set'),
      section,
      topic: asString(raw.topic) || 'General',
      difficulty: DIFFICULTIES.includes(raw.difficulty as Difficulty) ? (raw.difficulty as Difficulty) : undefined,
      original,
      templates: usable ? (templates as QuestionTemplate[]) : undefined,
      variants: [],
      usedVariants: [],
    });
  }
  return sets;
}

type PdfPart = ReturnType<typeof pdfPartFor>;

/** First step of reading a paper: its title and every question grouped into blocks, without extracting them. */
export async function outlinePaper(pdfPart: PdfPart): Promise<{ title: string; blocks: PaperBlock[] }> {
  const result = await generateJson<{ title?: unknown; blocks?: Array<Partial<PaperBlock>> }>(async (key) => [await pdfPart(key), OUTLINE_PROMPT], outlineSchema, pdfPart.forget);
  const blocks = (result.blocks ?? [])
    .map((block) => ({ from: Number(block.from), to: Number(block.to), section: SECTIONS.includes(block.section as Section) ? (block.section as Section) : 'quant', topic: asString(block.topic) || 'General' }))
    .filter((block) => Number.isInteger(block.from) && Number.isInteger(block.to) && block.from > 0 && block.to >= block.from)
    .sort((a, b) => a.from - b.from)
    // Drop blocks that overlap an earlier one, so no question is extracted twice.
    .filter((block, index, all) => index === 0 || block.from > all[index - 1].to);
  if (!blocks.length) throw new HttpError('No questions could be found in this PDF. Is it a scanned image or a password-protected file?', 422);
  return { title: asString(result.title), blocks };
}

/** Extracts one range of questions; the whole PDF is attached so shared passages and charts are visible. */
export async function extractQuestions(pdfPart: PdfPart, from: number, to: number): Promise<QuestionSet[]> {
  const result = await generateJson<{ sets?: ExtractedSet[] }>(async (key) => [await pdfPart(key), chunkPrompt(from, to)], extractionSchema, pdfPart.forget);
  return toQuestionSets(result.sets ?? []);
}

/** Allowed difference in length from the original: a share of it, but never less than a few words. */
const withinLength = (candidate: number, original: number, share: number, slack: number) => Math.abs(candidate - original) <= Math.max(original * share, slack);

/** A version must have the original's shape and length before it is worth reviewing. */
export function matchesOriginalShape(original: SetContent, candidate: SetContent) {
  if (candidate.questions.length !== original.questions.length) return false;
  if (Boolean(original.passage) !== Boolean(candidate.passage)) return false;
  if (original.passage && !withinLength(wordCount(candidate.passage), wordCount(original.passage), 0.2, 15)) return false;
  return original.questions.every((question, index) => {
    const other = candidate.questions[index];
    const optionWords = (item: StaticQuestion) => item.options.reduce((sum, option) => sum + wordCount(option), 0) / item.options.length;
    return other.options.length === question.options.length &&
      withinLength(wordCount(other.text), wordCount(question.text), 0.3, 6) &&
      withinLength(optionWords(other), optionWords(question), 0.5, 2);
  });
}

type Review = { id?: unknown; solvedAnswers?: unknown[]; difficulty?: unknown; language?: unknown; problems?: unknown };

/** Why a reviewed version was turned down, or null when it passed. */
function rejection(review: Review | undefined, candidate: SetContent) {
  if (!review) return 'not reviewed';
  const solved = Array.isArray(review.solvedAnswers) ? review.solvedAnswers.map(Number) : [];
  if (solved.length !== candidate.questions.length || candidate.questions.some((question, index) => solved[index] !== question.answerIndex)) return 'answer key disagreed';
  if (review.difficulty === 'easier') return 'easier than the original';
  if (review.language === 'simpler') return 'simpler wording than the original';
  if (asString(review.problems)) return asString(review.problems);
  return null;
}

/**
 * Writes new versions of the given sets, then keeps only those that pass every check: the original's
 * length and shape, an answer key that a separate review solves to the same answers, and difficulty
 * and wording at least as hard as the original. Returns the accepted versions and why others failed.
 */
export async function writeVariants(sets: QuestionSet[], count = VARIANTS_PER_SET) {
  const written = await generateJson<{ sets?: Array<{ id?: unknown; variants?: unknown[] }> }>(
    [VARIANTS_PROMPT(count), JSON.stringify(sets.map(({ id, section, topic, difficulty, original }) => ({
      id,
      section,
      topic,
      difficulty: difficulty ?? 'moderate',
      passageWords: wordCount(original.passage),
      questionWords: original.questions.map((question) => wordCount(question.text)),
      ...original,
    })))],
    variantsSchema,
  );

  const candidates: Array<{ id: string; set: QuestionSet; content: SetContent }> = [];
  const rejected: string[] = [];
  for (const raw of written.sets ?? []) {
    const set = sets.find((item) => item.id === raw.id);
    if (!set) continue;
    for (const content of (raw.variants ?? []).map(cleanContent)) {
      if (content && matchesOriginalShape(set.original, content)) candidates.push({ id: `${set.id}#${candidates.length}`, set, content });
      else rejected.push(`${set.topic}: different length or shape from the original`);
    }
  }
  if (!candidates.length) return { accepted: {} as Record<string, SetContent[]>, rejected };

  // The review sees no answer key, so agreeing with it is real evidence the key is right.
  const reviewed = await generateJson<{ reviews?: Review[] }>(
    [REVIEW_PROMPT, JSON.stringify(candidates.map(({ id, set, content }) => ({
      id,
      original: { difficulty: set.difficulty ?? 'moderate', ...set.original },
      candidate: { passage: content.passage, questions: content.questions.map(({ text, options }) => ({ text, options })) },
    })))],
    reviewSchema,
  );
  const reviews = new Map((reviewed.reviews ?? []).map((review) => [asString(review.id), review]));

  const accepted: Record<string, SetContent[]> = {};
  for (const { id, set, content } of candidates) {
    const reason = rejection(reviews.get(id), content);
    if (reason) rejected.push(`${set.topic}: ${reason}`);
    else accepted[set.id] = [...(accepted[set.id] ?? []), content];
  }
  return { accepted, rejected };
}
