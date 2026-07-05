import type { RateLimitConfig, RateLimitRule } from '../types.js';

interface RateLimitStore {
  increment: (key: string, windowMs: number) => Promise<{ count: number; resetAt: number }>;
  reset: (key: string) => Promise<void>;
}

class MemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, { count: number; resetAt: number }>();

  private cleanExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (entry.resetAt <= now) {
        this.store.delete(key);
      }
    }
  }

  async increment(key: string, windowMs: number): Promise<{ count: number; resetAt: number }> {
    this.cleanExpired();
    const now = Date.now();
    const existing = this.store.get(key);

    if (!existing || existing.resetAt <= now) {
      const entry = { count: 1, resetAt: now + windowMs };
      this.store.set(key, entry);
      return entry;
    }

    existing.count++;
    return existing;
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }
}

const globalStore = new MemoryRateLimitStore();

export function matchRateLimitRule(
  path: string,
  method: string,
  rules: RateLimitRule[]
): RateLimitRule | null {
  for (const rule of rules) {
    const pathMatch = rule.path instanceof RegExp
      ? rule.path.test(path)
      : pathMatchGlob(path, rule.path);

    if (!pathMatch) continue;

    if (rule.method) {
      const methods = Array.isArray(rule.method) ? rule.method : [rule.method];
      if (!methods.includes(method)) continue;
    }

    return rule;
  }

  return null;
}

function pathMatchGlob(path: string, pattern: string): boolean {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp('^' + escaped + '$', 'i').test(path);
}

export function getRateLimitKey(
  rule: RateLimitRule,
  ip: string | null,
  userId: string | null
): string {
  switch (rule.keyType) {
    case 'user':
      return `rl:user:${userId || 'anonymous'}:${rule.path}`;
    case 'bot':
      return `rl:bot:${ip || 'unknown'}:${rule.path}`;
    case 'ip':
    default:
      return `rl:ip:${ip || 'unknown'}:${rule.path}`;
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

export async function checkRateLimit(
  rule: RateLimitRule,
  key: string
): Promise<RateLimitResult> {
  const { count, resetAt } = await globalStore.increment(key, rule.windowMs);
  const remaining = Math.max(0, rule.max - count);
  const allowed = count <= rule.max;

  return {
    allowed,
    remaining,
    resetAt,
    retryAfter: allowed ? undefined : Math.ceil((resetAt - Date.now()) / 1000),
  };
}

export async function resetRateLimit(key: string): Promise<void> {
  await globalStore.reset(key);
}

export function resolveRateLimitConfig(
  config?: RateLimitConfig
): RateLimitConfig {
  return {
    enabled: config?.enabled ?? true,
    globalWindowMs: config?.globalWindowMs ?? 60_000,
    globalMax: config?.globalMax ?? 100,
    rules: config?.rules ?? [],
    store: config?.store ?? 'memory',
  };
}
