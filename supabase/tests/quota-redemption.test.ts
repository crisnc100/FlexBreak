import { reserve, spend } from "../functions/_shared/quota.ts";
import { Timestamp } from "firebase-admin/firestore";
import { codeExpiry, redeem } from "../functions/_shared/redemption.ts";
import { homeTimeZone, localCalendar } from "../functions/_shared/timezone.ts";
import { equal, MemoryDatabase, rejects } from "./helpers.ts";
const now = Date.parse("2026-09-10T12:00:00Z");
Deno.test("concurrent request reservations across callers grant only one lease", async () => {
  const db = new MemoryDatabase();
  const results = await Promise.allSettled(
    Array.from(
      { length: 12 },
      () => reserve(db, "canonical-paid-receipt", "chat", 15, { now }),
    ),
  );
  equal(results.filter((result) => result.status === "fulfilled").length, 1);
  const winner = results.find((result) =>
    result.status === "fulfilled"
  ) as PromiseFulfilledResult<(success: boolean) => Promise<void>>;
  await winner.value(true);
  for (let i = 0; i < 14; i++) {
    await (await reserve(db, "canonical-paid-receipt", "chat", 15, { now }))(
      true,
    );
  }
  await rejects(
    () => reserve(db, "canonical-paid-receipt", "chat", 15, { now }),
    "DAILY_LIMIT",
  );
});
Deno.test("failed provider refunds session and welcome, attempts still bounded", async () => {
  const db = new MemoryDatabase();
  await (await reserve(db, "free", "chat", 1, {
    now,
    welcome: true,
    wednesday: false,
  }))(false);
  await (await reserve(db, "free", "chat", 1, {
    now,
    welcome: true,
    wednesday: false,
  }))(true);
  await rejects(
    () =>
      reserve(db, "free", "chat", 1, {
        now: now + 86400000,
        welcome: true,
        wednesday: false,
      }),
    "FREE_WEDNESDAY_ONLY",
  );
});
Deno.test("global budget cannot be multiplied by UID recreation", async () => {
  const db = new MemoryDatabase();
  const result = await Promise.allSettled(
    Array.from({ length: 505 }, () => spend(db, "project", 1, now)),
  );
  equal(result.filter((item) => item.status === "fulfilled").length, 500);
});
Deno.test("code consumed atomically once, same UID retry returns original fixed expiry", async () => {
  const db = new MemoryDatabase();
  db.rows.set("oneTimeCodes/FAMILY-REAL", {
    expiresAt: "2026-10-01",
    type: "free_premium",
    duration: 30,
    used: false,
    email: "issuer@example.com",
  });
  const results = await Promise.allSettled(
    ["one", "two"].map((uid) =>
      redeem(db, { uid, emailVerified: false }, {
        code: "family-real",
        email: `${uid}@family.com`,
      }, now)
    ),
  );
  equal(results.filter((item) => item.status === "fulfilled").length, 1);
  const stored = db.rows.get("oneTimeCodes/FAMILY-REAL")!;
  const uid = String(stored.usedByUid);
  equal(
    await redeem(db, { uid, emailVerified: false }, {
      code: "FAMILY-REAL",
      email: `${uid}@family.com`,
    }, now + 86400000),
    stored.result,
  );
  equal(
    (stored.result as Record<string, unknown>).expiryDate,
    "2026-10-10T12:00:00.000Z",
  );
});
Deno.test("unknown, expired, and explicitly email-bound codes cannot grant", async () => {
  const db = new MemoryDatabase();
  const identity = { uid: "one", emailVerified: false };
  await rejects(
    () =>
      redeem(db, identity, { code: "FLEX-1234", email: "a@family.com" }, now),
    "INVALID_CODE",
  );
  db.rows.set("oneTimeCodes/EXPIRED", { expiresAt: "2020-01-01", used: false });
  await rejects(
    () => redeem(db, identity, { code: "EXPIRED", email: "a@family.com" }, now),
    "CODE_EXPIRED",
  );
  db.rows.set("oneTimeCodes/BOUND", {
    expiresAt: "2030-01-01",
    emailBindingPolicy: "verified_email",
    email: "a@family.com",
    used: false,
  });
  await rejects(
    () => redeem(db, identity, { code: "BOUND", email: "a@family.com" }, now),
    "CODE_EMAIL_MISMATCH",
  );
});
Deno.test("timezone persists once and local Wednesday survives UTC boundary", async () => {
  const db = new MemoryDatabase();
  equal(await homeTimeZone(db, "one", "America/New_York"), "America/New_York");
  equal(await homeTimeZone(db, "one", "Pacific/Auckland"), "America/New_York");
  equal(localCalendar("America/New_York", new Date("2026-09-10T02:00:00Z")), {
    day: "2026-09-09",
    wednesday: true,
  });
  await rejects(
    () => homeTimeZone(db, "two", "Invalid/Zone"),
    "INVALID_TIME_ZONE",
  );
});

Deno.test("project concurrency retains all active leases and frees exactly one slot", async () => {
  const db = new MemoryDatabase();
  const releases = await Promise.all(
    Array.from(
      { length: 8 },
      () =>
        reserve(db, "project", "concurrency", 2000, { now, maxConcurrent: 8 }),
    ),
  );
  await rejects(
    () =>
      reserve(db, "project", "concurrency", 2000, { now, maxConcurrent: 8 }),
    "REQUEST_IN_PROGRESS",
  );
  await releases[0](true);
  await reserve(db, "project", "concurrency", 2000, { now, maxConcurrent: 8 });
  await rejects(
    () =>
      reserve(db, "project", "concurrency", 2000, { now, maxConcurrent: 8 }),
    "REQUEST_IN_PROGRESS",
  );
});

Deno.test("Firestore timestamp code expiry takes precedence over legacy ISO value", () => {
  equal(
    codeExpiry({ expiresAtTimestamp: Timestamp.fromMillis(now + 1000) }),
    now + 1000,
  );
  equal(
    codeExpiry({
      expiresAtTimestamp: Timestamp.fromMillis(now - 1000),
      expiresAt: "2099-01-01",
    }),
    now - 1000,
  );
  equal(
    codeExpiry({ expiresAt: new Date(now + 1000).toISOString() }),
    now + 1000,
  );
  equal(
    Number.isNaN(
      codeExpiry({ expiresAtTimestamp: "invalid", expiresAt: "2099-01-01" }),
    ),
    true,
  );
});
