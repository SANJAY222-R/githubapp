import { redis } from "./redis.js";
import { CACHE_TTL_MS } from "@gitclone/shared";

const TTL_SECONDS = Math.floor(CACHE_TTL_MS / 1000);

export async function getCache<T>(key: string): Promise<T | null> {
  const val = await redis.get(key);
  if (!val) return null;
  try { return JSON.parse(val) as T; } catch { return null; }
}

export async function setCache(key: string, value: unknown, ttlSeconds = TTL_SECONDS) {
  await redis.setex(key, ttlSeconds, JSON.stringify(value));
}

export async function invalidateCache(...keys: string[]) {
  if (keys.length === 0) return;
  await redis.del(...keys);
}

export async function invalidatePattern(pattern: string) {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) await redis.del(...keys);
}
