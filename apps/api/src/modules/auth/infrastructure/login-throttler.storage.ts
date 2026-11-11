import type { ThrottlerStorage } from "@nestjs/throttler";

type Entry = { hits: number[]; blockedUntil: number };

/** In-memory counters with independent expiry for each key. */
export class LoginThrottlerStorage implements ThrottlerStorage {
  private readonly entries = new Map<string, Entry>();
  private requests = 0;

  async increment(key: string, ttl: number, limit: number, blockDuration: number, name: string) {
    const now = Date.now();
    const storageKey = `${name}:${key}`;
    if (++this.requests % 128 === 0) {
      for (const [entryKey, entry] of this.entries) {
        if (entry.blockedUntil <= now && entry.hits.every((expiry) => expiry <= now)) {
          this.entries.delete(entryKey);
        }
      }
    }
    const entry = this.entries.get(storageKey) ?? { hits: [], blockedUntil: 0 };
    this.entries.set(storageKey, entry);
    if (entry.blockedUntil && entry.blockedUntil <= now) {
      entry.blockedUntil = 0;
      entry.hits = [];
    }
    entry.hits = entry.hits.filter((expiry) => expiry > now);
    if (!entry.blockedUntil) {
      entry.hits.push(now + ttl);
      if (entry.hits.length > limit) entry.blockedUntil = now + blockDuration;
    }
    return {
      totalHits: entry.hits.length,
      timeToExpire: Math.max(0, Math.ceil(((entry.hits[0] ?? now) - now) / 1000)),
      isBlocked: entry.blockedUntil > now,
      timeToBlockExpire: Math.max(0, Math.ceil((entry.blockedUntil - now) / 1000))
    };
  }
}
