import 'server-only';
import { ApiError, GoogleGenAI, type PartUnion } from '@google/genai';
import { EXTRACTION_PROMPT, VARIANTS_PROMPT, extractionSchema, variantsSchema } from '@/lib/gemini-prompt';
import { templatesWork, uid } from '@/lib/mock-generator';
import { HttpError } from '@/lib/server/http';
import { SECTIONS, type QuestionSet, type QuestionTemplate, type Section, type SetContent, type StaticQuestion } from '@/types/mock-test';

export const VARIANTS_PER_SET = 2;
/** Sets per rewrite call: small enough to stay well inside the output limit. */
const VARIANT_BATCH_SIZE = 6;
const PARALLEL_CALLS = 4;

let client: GoogleGenAI | null = null;
function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new HttpError('GEMINI_API_KEY is not set. Add it to .env.local, or to the Vercel project\'s environment variables, then restart or redeploy.', 500);
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

async function generateJson<T>(parts: PartUnion[], schema: object): Promise<T> {
  const gemini = getClient();
  let text: string | undefined;
  try {
    const response = await gemini.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-flash-latest',
      contents: [{ role: 'user', parts: parts.map((part) => (typeof part === 'string' ? { text: part } : part)) }],
      config: { responseMimeType: 'application/json', responseJsonSchema: schema, temperature: 0.4 },
    });
    text = response.text;
  } catch (error) {
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

const asString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

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

function cleanTemplate(raw: unknown): QuestionTemplate | null {
  const value = raw as Partial<QuestionTemplate> | null;
  const variables = (Array.isArray(value?.variables) ? value.variables : [])
    .map((variable) => ({ name: asString(variable?.name), min: Number(variable?.min), max: Number(variable?.max), step: Number(variable?.step) || 1 }))
    .filter((variable) => /^[a-z_][a-z0-9_]*$/i.test(variable.name) && Number.isFinite(variable.min) && Number.isFinite(variable.max) && variable.max >= variable.min);
  if (!value || !variables.length || !asString(value.answerExpr)) return null;
  return {
    text: asString(value.text),
    variables,
    answerExpr: asString(value.answerExpr),
    distractorExprs: Array.isArray(value.distractorExprs) ? value.distractorExprs.map(asString).filter(Boolean) : [],
    answerFormat: value.answerFormat === 'decimal2' ? 'decimal2' : 'integer',
    optionFormat: asString(value.optionFormat) || '{value}',
    explanation: asString(value.explanation),
  };
}

type ExtractedSet = { section?: unknown; topic?: unknown; passage?: unknown; questions?: unknown[]; templates?: unknown[] };

/** Reads the PDF into question sets. Numeric Quant keeps its templates only when they produce valid questions. */
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
    const templates = (raw.templates ?? []).map(cleanTemplate);
    const usable = section === 'quant' && templates.length === original.questions.length && templates.every(Boolean) && templatesWork(templates as QuestionTemplate[]);
    sets.push({
      id: uid('set'),
      section,
      topic: asString(raw.topic) || 'General',
      original,
      templates: usable ? (templates as QuestionTemplate[]) : undefined,
      variants: [],
      usedVariants: [],
    });
  }
  if (!sets.length) throw new HttpError('No questions could be read from this PDF. Is it a scanned image or a password-protected file?', 422);
  return { title: asString(result.title), sets };
}

async function inBatches<T, R>(items: T[], size: number, run: (batch: T[]) => Promise<R>): Promise<PromiseSettledResult<R>[]> {
  const batches = Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size));
  const results: PromiseSettledResult<R>[] = [];
  for (let start = 0; start < batches.length; start += PARALLEL_CALLS) {
    results.push(...await Promise.allSettled(batches.slice(start, start + PARALLEL_CALLS).map(run)));
  }
  return results;
}

/**
 * Asks Gemini for new versions of each set and returns them by set id. A failed batch only means
 * those sets get no new versions this time; the first error is reported if nothing succeeded.
 */
export async function writeVariants(sets: QuestionSet[], count = VARIANTS_PER_SET): Promise<Record<string, SetContent[]>> {
  const byId: Record<string, SetContent[]> = {};
  const results = await inBatches(sets, VARIANT_BATCH_SIZE, (batch) => generateJson<{ sets?: Array<{ id?: unknown; variants?: unknown[] }> }>(
    [VARIANTS_PROMPT(count), JSON.stringify(batch.map(({ id, section, topic, original }) => ({ id, section, topic, ...original })))],
    variantsSchema,
  ));
  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    for (const raw of result.value.sets ?? []) {
      const set = sets.find((item) => item.id === raw.id);
      if (!set) continue;
      // A version must keep the shape of the original, or it won't fit the set's place in the paper.
      const variants = (raw.variants ?? []).map(cleanContent).filter((content): content is SetContent => content?.questions.length === set.original.questions.length);
      byId[set.id] = [...(byId[set.id] ?? []), ...variants];
    }
  }
  const failed = results.find((result) => result.status === 'rejected');
  if (!Object.keys(byId).length && failed) throw failed.reason;
  return byId;
}
