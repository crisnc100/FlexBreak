import type { Database } from "./database.ts";
import { HttpError } from "./http.ts";
export async function reserve(
  db: Database,
  key: string,
  scope: string,
  limit: number,
  options: {
    now?: number;
    welcome?: boolean;
    wednesday?: boolean;
    day?: string;
    maxConcurrent?: number;
  } = {},
) {
  const now = options.now ?? Date.now();
  const day = options.day ?? new Date(now).toISOString().slice(0, 10);
  const path = `backendUsage/${scope}_${key}`;
  const lease = crypto.randomUUID();
  await db.transaction(async (tx) => {
    const stored = await tx.get(path) || {};
    const current = stored.day === day
      ? stored
      : { used: 0, attempts: 0, everUsed: stored.everUsed === true };
    const active = Object.fromEntries(
      Object.entries((stored.active || {}) as Record<string, number>).filter((
        [, until],
      ) => until > now),
    );
    if (Object.keys(active).length >= (options.maxConcurrent ?? 1)) {
      throw new HttpError(429, "REQUEST_IN_PROGRESS");
    }
    if (Number(current.attempts || 0) >= Math.max(10, limit * 3)) {
      throw new HttpError(429, "ATTEMPT_LIMIT");
    }
    if (options.welcome && !options.wednesday && current.everUsed) {
      throw new HttpError(403, "FREE_WEDNESDAY_ONLY");
    }
    if (Number(current.used || 0) >= limit) {
      throw new HttpError(429, "DAILY_LIMIT");
    }
    tx.set(path, {
      ...current,
      day,
      used: Number(current.used || 0) + 1,
      attempts: Number(current.attempts || 0) + 1,
      active: { ...active, [lease]: now + 180000 },
    });
  });
  return async (success: boolean) => {
    await db.transaction(async (tx) => {
      const current = await tx.get(path);
      if (
        !current ||
        !(current.active as Record<string, number> | undefined)?.[lease]
      ) return;
      const active = { ...current.active as Record<string, number> };
      delete active[lease];
      tx.set(path, {
        ...current,
        active,
        used: !success && current.day === day
          ? Math.max(0, Number(current.used) - 1)
          : current.used,
        everUsed: success ? true : current.everUsed === true,
      });
    });
  };
}

// Aggregate budget survives UID recreation and different edge isolates. A billed
// attempt is never refunded: upstream timeouts can still incur provider cost.
export async function spend(
  db: Database,
  provider: string,
  units = 1,
  now = Date.now(),
) {
  const setting = (name: string, fallback: number, ceiling: number) => {
    const value = Number(Deno.env.get(name) || fallback);
    if (!Number.isFinite(value) || value <= 0 || value > ceiling) {
      throw new HttpError(503, "INVALID_BUDGET_CONFIG");
    }
    return value;
  };
  const dailyLimit = provider === "legacy"
    ? setting("LEGACY_DAILY_REQUEST_LIMIT", 50, 100)
    : setting("PROJECT_DAILY_REQUEST_LIMIT", 500, 2000);
  const monthlyLimit = provider === "legacy"
    ? setting("LEGACY_MONTHLY_REQUEST_LIMIT", 500, 1000)
    : setting("PROJECT_MONTHLY_REQUEST_LIMIT", 5000, 20000);
  const date = new Date(now).toISOString();
  const dayPath = `backendBudgets/${provider}_day_${date.slice(0, 10)}`;
  const monthPath = `backendBudgets/${provider}_month_${date.slice(0, 7)}`;
  await db.transaction(async (tx) => {
    const daily = Number((await tx.get(dayPath))?.used || 0);
    const monthly = Number((await tx.get(monthPath))?.used || 0);
    if (daily + units > dailyLimit || monthly + units > monthlyLimit) {
      throw new HttpError(429, "PROJECT_BUDGET_LIMIT");
    }
    tx.set(dayPath, { used: daily + units });
    tx.set(monthPath, { used: monthly + units });
  });
}
