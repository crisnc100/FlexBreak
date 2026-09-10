import { handler } from "../functions/_shared/handler.ts";
import { legacyHandler } from "../functions/_shared/legacy.ts";
import { HttpError } from "../functions/_shared/http.ts";
import { equal, MemoryDatabase } from "./helpers.ts";
const request = (data: unknown) =>
  new Request("https://example.test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ timeZone: "America/New_York", ...data as object }),
  });
const identity = { uid: "verified-firebase-uid", emailVerified: false };
Deno.test("v2 chat runtime ignores spoofed UID/premium and uses authoritative quota identity", async () => {
  const db = new MemoryDatabase();
  let verifiedUid = "";
  const run = handler("ai-chat-v2", {
    authenticate: () => Promise.resolve(identity),
    database: () => db,
    premiumState: (_db, uid) => {
      verifiedUid = uid;
      return Promise.resolve({ premium: true, quotaKey: "canonical-receipt" });
    },
    chatProvider: () =>
      Promise.resolve({
        text: "Take a gentle stretch.",
        limited: false,
      }),
  });
  const response = await run(
    request({
      userId: "attacker-picked",
      premium: true,
      messages: [{ role: "user", content: "My shoulders feel tense" }],
    }),
  );
  equal(response.status, 200);
  equal(await response.json(), {
    success: true,
    data: "Take a gentle stretch.",
  });
  equal(verifiedUid, identity.uid);
  equal(db.rows.get("backendUsage/chat_canonical-receipt")?.used, 1);
  equal(db.rows.has("backendUsage/chat_attacker-picked"), false);
});
Deno.test("v2 provider outage returns failure and refunds session but charges project attempt", async () => {
  const db = new MemoryDatabase();
  const run = handler("ai-chat-v2", {
    authenticate: () => Promise.resolve(identity),
    database: () => db,
    premiumState: () => Promise.resolve({ premium: true, quotaKey: "paid" }),
    chatProvider: () => {
      throw new HttpError(502, "UPSTREAM_UNAVAILABLE");
    },
  });
  const response = await run(
    request({ messages: [{ role: "user", content: "Relax" }] }),
  );
  equal(response.status, 502);
  equal((await response.json()).success, false);
  equal(db.rows.get("backendUsage/chat_paid")?.used, 0);
  equal(
    [...db.rows.entries()].find(([key]) =>
      key.startsWith("backendBudgets/project_day_")
    )?.[1].used,
    1,
  );
});
Deno.test("v2 redeem endpoint returns same authoritative grant after lost client response", async () => {
  const db = new MemoryDatabase();
  db.rows.set("oneTimeCodes/VALID-FAMILY", {
    expiresAt: "2099-01-01",
    type: "free_premium",
    duration: 10,
    used: false,
  });
  const run = handler("redeem-code-v2", {
    authenticate: () => Promise.resolve(identity),
    database: () => db,
  });
  const input = { code: "VALID-FAMILY", email: "person@family.com" };
  const first = await run(request(input));
  const second = await run(request(input));
  equal(first.status, 200);
  equal(await first.json(), await second.json());
});
Deno.test("v2 purchase endpoint persists verifier result, never client claimed expiry", async () => {
  const db = new MemoryDatabase();
  const run = handler("verify-purchase-v2", {
    authenticate: () => Promise.resolve(identity),
    database: () => db,
    verifyStore: (input) =>
      Promise.resolve({
        ...input,
        canonicalId: "apple:Production:verified-original",
        isActive: false,
        expiryDate: "2025-01-01T00:00:00.000Z",
        purchaseDate: "2024-01-01T00:00:00.000Z",
        autoRenewing: false,
      }),
  });
  const response = await run(
    request({
      platform: "ios",
      productId: "flexbreak_monthly_4.99",
      purchaseToken: "header.payload.signature",
      expiryDate: "2099-01-01",
      isActive: true,
    }),
  );
  equal(response.status, 200);
  const result = await response.json();
  equal(result.data.isActive, false);
  equal(result.data.expiryDate, "2025-01-01T00:00:00.000Z");
});
Deno.test("v2 speech endpoint returns real adapter transcript envelope", async () => {
  const db = new MemoryDatabase();
  const bytes = new Uint8Array(27);
  bytes.set(new TextEncoder().encode("#!AMR-WB\n"));
  bytes[9] = 4;
  const run = handler("transcribe-audio-v2", {
    authenticate: () => Promise.resolve(identity),
    database: () => db,
    premiumState: () =>
      Promise.resolve({ premium: false, quotaKey: identity.uid }),
    transcribe: (input) => {
      equal(input.config.encoding, "AMR_WB");
      return Promise.resolve({
        text: "Stretch my neck",
        detectedLanguage: "en-US",
      });
    },
  });
  const response = await run(
    request({
      audioContent: btoa(String.fromCharCode(...bytes)),
      encoding: "AMR_WB",
      sampleRateHertz: 16000,
    }),
  );
  equal(response.status, 200);
  equal(await response.json(), {
    success: true,
    data: { text: "Stretch my neck", detectedLanguage: "en-US" },
  });
});
Deno.test("legacy chat remains old envelope with mapped model but shares aggregate budgets", async () => {
  const db = new MemoryDatabase();
  const run = legacyHandler("ai-chat-firebase", {
    database: () => db,
    enabled: () => true,
    chat: (input) => {
      equal(input.maxTokens, 300);
      return Promise.resolve("Breathe slowly.");
    },
  });
  const response = await run(
    request({
      userId: "anonymous",
      messages: [{ role: "user", content: "Relax" }],
      options: { model: "mistralai/mistral-7b-instruct:free", maxTokens: 500 },
    }),
  );
  equal(response.status, 200);
  equal(await response.json(), { success: true, data: "Breathe slowly." });
  equal(
    [...db.rows.entries()].find(([key]) =>
      key.startsWith("backendBudgets/project_day_")
    )?.[1].used,
    1,
  );
  const disabled = await legacyHandler("ai-chat", { enabled: () => false })(
    request({}),
  );
  equal(disabled.status, 503);
});
Deno.test("legacy verification retains top-level status and provider failures never approve", async () => {
  const db = new MemoryDatabase();
  const run = legacyHandler("verify-email", {
    database: () => db,
    enabled: () => true,
    qualifyEmail: () =>
      Promise.resolve({
        status: "approved",
        message: "Work email verified.",
        discountType: "office",
        company: "work.com",
        details: {
          email: "a@work.com",
          domain: "work.com",
          isBusinessEmail: true,
          validationScore: 1,
        },
      }),
  });
  const response = await run(request({ email: "a@work.com" }));
  equal((await response.json()).status, "approved");
  const failing = legacyHandler("verify-email", {
    database: () => db,
    enabled: () => true,
    qualifyEmail: () => {
      throw new HttpError(503, "EMAIL_VERIFICATION_UNAVAILABLE");
    },
  });
  const failure = await failing(request({ email: "a@work.com" }));
  equal(failure.status, 503);
  equal((await failure.json()).status, "error");
});

Deno.test("exhausted UID is rejected before spending project or email budget", async () => {
  const db = new MemoryDatabase();
  const day = new Date().toISOString().slice(0, 10);
  db.rows.set(`backendUsage/requests_${identity.uid}`, { day, used: 60 });
  const run = handler("verify-email-v2", {
    authenticate: () => Promise.resolve(identity),
    database: () => db,
  });
  equal((await run(request({ email: "person@gmail.com" }))).status, 429);
  equal(db.rows.has(`backendBudgets/project_day_${day}`), false);
  db.rows.delete(`backendUsage/requests_${identity.uid}`);
  equal((await run(request({ email: "person@gmail.com" }))).status, 200);
  equal(db.rows.has(`backendBudgets/zerobounce_day_${day}`), false);
});
Deno.test("legacy lower budget cannot drain the v2 project allowance", async () => {
  const db = new MemoryDatabase();
  const day = new Date().toISOString().slice(0, 10);
  db.rows.set(`backendBudgets/legacy_day_${day}`, { used: 100 });
  const run = legacyHandler("verify-email", {
    enabled: () => true,
    database: () => db,
  });
  equal((await run(request({ email: "person@gmail.com" }))).status, 429);
  equal(db.rows.has(`backendBudgets/project_day_${day}`), false);
});
