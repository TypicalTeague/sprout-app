// Real KV client for api/*.ts only — never imported by tests (those use the
// in-memory fake in store.test.ts) or by client code. Falls back to an
// in-memory store with a warning when no Upstash env vars are present, so
// `vercel dev` and manual local testing work before the integration is
// connected (constitution.md: fail soft).

import process from 'node:process';
import { Redis } from '@upstash/redis';
import type { KVClient } from './store.js';

function findEnv(names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  return undefined;
}

let cached: KVClient | undefined;

export function getKVClient(): KVClient {
  if (cached) return cached;

  const url = findEnv(['UPSTASH_REDIS_REST_URL', 'KV_REST_API_URL']);
  const token = findEnv(['UPSTASH_REDIS_REST_TOKEN', 'KV_REST_API_TOKEN']);

  if (url && token) {
    const redis = new Redis({ url, token });
    cached = {
      // @upstash/redis auto-deserializes JSON-looking values on get(), so a
      // stored JSON string comes back as a parsed object, not a string.
      // Normalize back to a string either way to honor the KVClient contract.
      get: async (key) => {
        const v = await redis.get<unknown>(key);
        if (v == null) return null;
        return typeof v === 'string' ? v : JSON.stringify(v);
      },
      set: (key, value) => redis.set(key, value).then(() => undefined),
    };
    return cached;
  }

  console.warn(
    '[sprout] No Upstash env vars found — using an in-memory store that will NOT persist between requests. Connect Upstash for Redis in the Vercel project to fix this.',
  );
  const memory = new Map<string, string>();
  cached = {
    get: async (key) => memory.get(key) ?? null,
    set: async (key, value) => {
      memory.set(key, value);
    },
  };
  return cached;
}
