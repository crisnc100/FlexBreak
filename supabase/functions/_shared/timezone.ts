import type { Database } from "./database.ts";
import { HttpError, text } from "./http.ts";
export function homeTimeZone(
  db: Database,
  uid: string,
  supplied: unknown,
): Promise<string> {
  const proposed = text(supplied, 100, "TIME_ZONE");
  let validated: string;
  try {
    validated =
      new Intl.DateTimeFormat("en", { timeZone: proposed }).resolvedOptions()
        .timeZone;
  } catch {
    throw new HttpError(400, "INVALID_TIME_ZONE");
  }
  return Promise.resolve(db.transaction(async (tx) => {
    const path = `backendUsers/${uid}`;
    const existing = await tx.get(path);
    if (typeof existing?.timeZone === "string") return existing.timeZone;
    tx.set(path, {
      ...existing,
      timeZone: validated,
      createdAt: new Date().toISOString(),
    });
    return validated;
  }));
}
export function localCalendar(timeZone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(now);
  const part = (name: string) =>
    parts.find((value) => value.type === name)!.value;
  return {
    day: `${part("year")}-${part("month")}-${part("day")}`,
    wednesday: part("weekday") === "Wed",
  };
}
