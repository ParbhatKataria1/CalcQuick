import 'server-only';
import { createHash } from 'node:crypto';
import { ApiError, GoogleGenAI } from '@google/genai';
import { HttpError } from '@/lib/server/http';
import { kv } from '@/lib/server/kv';

export type GeminiKey = { id: string; client: GoogleGenAI };
type KeyState = { until: number; reason: string };

const MINUTE = 60_000;
const RATE_LIMIT_COOLDOWN_MS = MINUTE;
const BAD_KEY_COOLDOWN_MS = 24 * 60 * MINUTE;

let pool: GeminiKey[] | null = null;

/**
 * The configured keys, in order: GEMINI_API_KEYS (comma or space separated) and GEMINI_API_KEY.
 * Each key gets a short id from its hash, so logs and stored state never contain the key itself.
 */
export function geminiKeys(): GeminiKey[] {
  pool ??= [...new Set(`${process.env.GEMINI_API_KEYS ?? ''},${process.env.GEMINI_API_KEY ?? ''}`.split(/[\s,]+/).filter(Boolean))]
    .map((apiKey) => ({ id: createHash('sha256').update(apiKey).digest('hex').slice(0, 10), client: new GoogleGenAI({ apiKey }) }));
  return pool;
}

const stateKey = (id: string) => `gemini-key:${id}`;

/** Free-tier daily quotas reset at midnight Pacific time. */
function nextPacificMidnight(now = new Date()) {
  const pacific = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  const offset = now.getTime() - pacific.getTime();
  const midnight = new Date(pacific);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() + offset;
}

/** How long to rest a key after an error that is about the key itself (not the request or Google's load). */
function keyProblem(error: unknown): KeyState | null {
  if (!(error instanceof ApiError)) return null;
  const message = error.message ?? '';
  if (error.status === 429) {
    return /per ?day|perday|daily/i.test(message)
      ? { until: nextPacificMidnight(), reason: 'daily quota used up' }
      : { until: Date.now() + RATE_LIMIT_COOLDOWN_MS, reason: 'rate limit reached' };
  }
  if (error.status === 401 || error.status === 403) return { until: Date.now() + BAD_KEY_COOLDOWN_MS, reason: 'key rejected (revoked or no access)' };
  if (error.status === 400 && /api[_ ]?key/i.test(message)) return { until: Date.now() + BAD_KEY_COOLDOWN_MS, reason: 'key invalid or expired' };
  return null;
}

const pacificTime = (timestamp: number) => new Date(timestamp).toLocaleTimeString('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', minute: '2-digit' });

/**
 * Runs a Gemini request with the first available key. When a key runs out (quota, rate limit,
 * revoked) it is rested and the same request goes to the next key. Requests carry their whole
 * context (prompt, PDF reference), so switching keys loses nothing.
 */
export async function withGeminiKey<T>(run: (key: GeminiKey) => Promise<T>): Promise<T> {
  const keys = geminiKeys();
  if (!keys.length) throw new HttpError('No Gemini API key is set. Add GEMINI_API_KEYS (or GEMINI_API_KEY) to .env.local or the Vercel project, then restart or redeploy.', 500);

  const states = new Map<string, KeyState | null>(await Promise.all(keys.map(async (key) => [key.id, await kv.get<KeyState>(stateKey(key.id))] as const)));
  for (const key of keys) {
    if ((states.get(key.id)?.until ?? 0) > Date.now()) continue;
    try {
      return await run(key);
    } catch (error) {
      const problem = keyProblem(error);
      if (!problem) throw error;
      states.set(key.id, problem);
      await kv.set(stateKey(key.id), problem, { ttlSeconds: Math.max(1, Math.ceil((problem.until - Date.now()) / 1000)) });
      console.warn(`Gemini key ${key.id}: ${problem.reason}; trying the next key.`);
    }
  }

  const soonest = Math.min(...keys.map((key) => states.get(key.id)?.until ?? Date.now()));
  const reasons = [...new Set(keys.map((key) => states.get(key.id)?.reason).filter(Boolean))].join(', ');
  throw new HttpError(`All ${keys.length} Gemini ${keys.length === 1 ? 'key is' : 'keys are'} unavailable (${reasons}) until about ${pacificTime(soonest)} Pacific time. Your progress is saved — continue later.`, 429);
}
