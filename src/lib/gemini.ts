import 'server-only';
import { ApiError, GoogleGenAI, type PartUnion } from '@google/genai';
import { EXTRACTION_PROMPT, REVIEW_PROMPT, VARIANTS_PROMPT, extractionSchema, reviewSchema, variantsSchema } from '@/lib/gemini-prompt';
import { decodeEscapes, wordCount } from '@/lib/math-text';
import { optionSpreadOf, templateWorks, uid } from '@/lib/mock-generator';
import { HttpError } from '@/lib/server/http';
import { SECTIONS, type Difficulty, type QuestionSet, type QuestionTemplate, type Section, type SetContent, type StaticQuestion } from '@/types/mock-test';

export const VARIANTS_PER_SET = 2;
/** Sets the browser sends per request; with the review pass this stays well inside the 300 s function limit. */
export const VARIANT_SETS_PER_REQUEST = 3;

let client: GoogleGenAI | null = null;
function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new HttpError('GEMINI_API_KEY is not set. Add it to .env.local, or to the Vercel project\'s environment variables, then restart or redeploy.', 500);
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

/** Waits before each retry while Gemini is overloaded; keeps the whole call well inside the 300 s function limit. */
const RETRY_DELAYS_MS = [3000, 8000];
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Overloaded (503), internal (500) and gateway errors are usually brief, so they are worth retrying. */
const isTemporary = (error: unknown) => error instanceof ApiError && [500, 502, 503, 504].includes(error.status);

const models = () => [...new Set([process.env.GEMINI_MODEL || 'gemini-flash-latest', process.env.GEMINI_FALLBACK_MODEL || 'gemini-flash-lite-latest'])];

async function generateJson<T>(parts: PartUnion[], schema: object): Promise<T> {
  const gemini = getClient();
  const request = (model: string) => gemini.models.generateContent({
    model,
    contents: [{ role: 'user', parts: parts.map((part) => (typeof part === 'string' ? { text: part } : part)) }],
    config: { responseMimeType: 'application/json', responseJsonSchema: schema, temperature: 0.4 },
  });

  let text: string | undefined;
  let lastError: unknown;
  // Retry the main model a couple of times, then try the lighter fallback model once.
  const plan = [...[0, ...RETRY_DELAYS_MS].map((delay) => ({ model: models()[0], delay })), ...models().slice(1).map((model) => ({ model, delay: 0 }))];
  for (const { model, delay } of plan) {
    if (delay) await sleep(delay);
    try {
      text = (await request(model)).text;
      lastError = undefined;
      break;
    } catch (error) {
      lastError = error;
      if (!isTemporary(error)) break;
    }
  }

  if (lastError) {
    const error = lastError;
    if (isTemporary(error)) throw new HttpError('Gemini is overloaded right now (this is on Google\'s side). Wait a few minutes and upload again.', 503);
    if (error instanceof ApiError) {
      if (error.status === 429) throw new HttpError('Gemini quota or rate limit reached. Wait a minute and try again.', 429);
      if (error.status === 400 || error.status === 403) throw new HttpError(`Gemini rejected the request: ${error.message}`, error.status);
    }
    throw new HttpError(`Gemini request failed: ${error instanceof Error ? error.message : String(error)}`, 502);
  }
  if (!text) throw new HttpError('Gemini returned an empty response. Try again.', 502);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new HttpError('Gemini returned malformed JSON. Try again.', 502);
  }
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
 * Reads the PDF into question sets. A calculation set keeps its templates only if each one gives the
 * original's answer when fed the original numbers, and keeps producing valid questions; otherwise it
 * gets AI-written versions like every other set.
 */
export async function extractSets(pdf: Buffer): Promise<{ title: string; sets: QuestionSet[] }> {
  const result = await generateJson<{ title?: unknown; sets?: ExtractedSet[] }>(
    [{ inlineData: { mimeType: 'application/pdf', data: pdf.toString('base64') } }, EXTRACTION_PROMPT],
    extractionSchema,
  );
  const sets: QuestionSet[] = [];
  for (const raw of result.sets ?? []) {
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
  if (!sets.length) throw new HttpError('No questions could be read from this PDF. Is it a scanned image or a password-protected file?', 422);
  return { title: asString(result.title), sets };
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
