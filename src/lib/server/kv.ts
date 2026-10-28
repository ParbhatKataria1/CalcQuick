import 'server-only';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Redis } from '@upstash/redis';
import { HttpError } from '@/lib/server/http';

/** The few operations the app needs; values are stored as JSON. */
type KV = {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, options?: { ttlSeconds?: number }): Promise<void>;
  del(...keys: string[]): Promise<void>;
};

const hasRedis = Boolean((process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL) && (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN));

function redisStore(): KV {
  const redis = Redis.fromEnv();
  return {
    get: (key) => redis.get(key),
    set: async (key, value, options) => {
      if (options?.ttlSeconds) await redis.set(key, value, { ex: options.ttlSeconds });
      else await redis.set(key, value);
    },
    del: async (...keys) => {
      if (keys.length) await redis.del(...keys);
    },
  };
}

/** Development fallback: one JSON file per key under .data/, so `npm run dev` works without a database. */
function fileStore(): KV {
  const root = path.join(process.cwd(), '.data', 'kv');
  const file = (key: string) => path.join(root, `${encodeURIComponent(key)}.json`);
  return {
    async get<T>(key: string) {
      try {
        const entry = JSON.parse(await readFile(file(key), 'utf8')) as { value: T; expiresAt?: number };
        if (entry.expiresAt && entry.expiresAt < Date.now()) return null;
        return entry.value;
      } catch {
        return null;
      }
    },
    async set(key, value, options) {
      await mkdir(root, { recursive: true });
      await writeFile(file(key), JSON.stringify({ value, expiresAt: options?.ttlSeconds ? Date.now() + options.ttlSeconds * 1000 : undefined }));
    },
    async del(...keys) {
      await Promise.all(keys.map((key) => rm(file(key), { force: true })));
    },
  };
}

function unconfigured(): KV {
  const fail = async (): Promise<never> => {
    throw new HttpError('The database is not connected. In Vercel, open Storage, connect Upstash for Redis to this project and redeploy.', 503);
  };
  return { get: fail, set: fail, del: fail };
}

// Serverless deployments can't keep files, so they need Redis; local development can use files.
export const kv: KV = hasRedis ? redisStore() : process.env.VERCEL ? unconfigured() : fileStore();
