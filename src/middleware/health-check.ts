export interface HealthCheckResult {
  ok: boolean;
  services: Record<string, { ok: boolean; latencyMs?: number; error?: string }>;
}

export type HealthCheckFn = () => Promise<{ ok: boolean; latencyMs?: number; error?: string }>;

export class HealthChecker {
  private checks = new Map<string, HealthCheckFn>();

  register(name: string, fn: HealthCheckFn): void {
    this.checks.set(name, fn);
  }

  unregister(name: string): void {
    this.checks.delete(name);
  }

  async runAll(): Promise<HealthCheckResult> {
    const services: HealthCheckResult['services'] = {};
    let overallOk = true;

    const entries = Array.from(this.checks.entries());
    const results = await Promise.allSettled(
      entries.map(async ([name, fn]) => {
        const startedAt = performance.now();
        try {
          const result = await fn();
          return { name, ok: result.ok, latencyMs: Math.round(performance.now() - startedAt), error: result.error };
        } catch (err: unknown) {
          return {
            name,
            ok: false,
            latencyMs: Math.round(performance.now() - startedAt),
            error: err instanceof Error ? err.message : String(err),
          };
        }
      })
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { name, ok, latencyMs, error } = result.value;
        services[name] = { ok, latencyMs, error };
        if (!ok) overallOk = false;
      } else {
        services[entries[results.indexOf(result)][0]] = {
          ok: false,
          error: result.reason instanceof Error ? result.reason.message : String(result.reason),
        };
        overallOk = false;
      }
    }

    return { ok: overallOk, services };
  }

  async isHealthy(name: string): Promise<boolean> {
    const fn = this.checks.get(name);
    if (!fn) throw new Error(`No health check registered for: ${name}`);
    const result = await fn();
    return result.ok;
  }
}

export const globalHealthChecker = new HealthChecker();
