/**
 * Lightweight localStorage cache with TTL.
 * All operations are wrapped in try/catch — never throws.
 */

interface CacheEntry<T> {
  data: T;
  ts: number; // epoch ms
}

function safeStringify(v: unknown): string {
  try { return JSON.stringify(v, (_k, val) => typeof val === 'bigint' ? val.toString() + 'n' : val); }
  catch { return ''; }
}

function safeParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw, (_k, val) => {
      if (typeof val === 'string' && /^\d+n$/.test(val)) return BigInt(val.slice(0, -1));
      return val;
    }) as T;
  } catch { return null; }
}

export function cacheSet<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { data, ts: Date.now() };
    localStorage.setItem(key, safeStringify(entry));
  } catch {}
}

export function cacheGet<T>(key: string, maxAgeMs: number): { data: T; ts: number } | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry = safeParse<CacheEntry<T>>(raw);
    if (!entry) return null;
    if (Date.now() - entry.ts > maxAgeMs) return null;
    return entry;
  } catch { return null; }
}

export function cacheGetStale<T>(key: string): { data: T; ts: number } | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry = safeParse<CacheEntry<T>>(raw);
    return entry ?? null;
  } catch { return null; }
}
