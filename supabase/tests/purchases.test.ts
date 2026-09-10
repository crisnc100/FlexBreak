import {
  appleResult,
  BUNDLE,
  googleResult,
  persistPurchase,
  premiumState,
  purchaseInput,
} from "../functions/_shared/purchases.ts";
import { equal, MemoryDatabase, rejects } from "./helpers.ts";
const now = Date.parse("2026-09-10T12:00:00Z");
const ios = {
  platform: "ios" as const,
  productId: "flexbreak_monthly_4.99",
  purchaseToken: "header.payload.signature",
};
const payload = {
  bundleId: BUNDLE,
  productId: ios.productId,
  environment: "Production",
  originalTransactionId: "store-original",
  expiresDate: now + 3600000,
  purchaseDate: now - 86400000,
};
Deno.test("Apple policy requires exact verified bundle/SKU/environment and denies expired/refunded status", async () => {
  equal(appleResult(ios, payload, 1, true, "Production", now).isActive, true);
  equal(
    appleResult(
      ios,
      { ...payload, expiresDate: now - 1 },
      1,
      true,
      "Production",
      now,
    ).isActive,
    false,
  );
  equal(
    appleResult(
      ios,
      { ...payload, revocationDate: now - 1 },
      1,
      true,
      "Production",
      now,
    ).isActive,
    false,
  );
  equal(appleResult(ios, payload, 5, true, "Production", now).isActive, false);
  for (
    const mismatch of [{ bundleId: "attacker.app" }, { productId: "other" }, {
      environment: "Sandbox",
    }]
  ) {
    await rejects(
      () =>
        appleResult(
          ios,
          { ...payload, ...mismatch },
          1,
          true,
          "Production",
          now,
        ),
      "APPLE_PURCHASE_MISMATCH",
    );
  }
  await rejects(
    () =>
      purchaseInput({
        ...ios,
        purchaseToken: "1234567890",
        transactionId: "1234567890",
      }),
    "SIGNED_STOREKIT_PROOF_REQUIRED",
  );
});
Deno.test("Google policy requires exact SKU and live expiry/state; cancellation retains paid period", async () => {
  const input = {
    platform: "android" as const,
    productId: ios.productId,
    purchaseToken: "long-real-format-token-used-only-in-fixture",
  };
  const data = {
    subscriptionState: "SUBSCRIPTION_STATE_ACTIVE",
    startTime: new Date(now - 86400000).toISOString(),
    lineItems: [{
      productId: input.productId,
      expiryTime: new Date(now + 3600000).toISOString(),
      autoRenewingPlan: { autoRenewEnabled: true },
    }],
  };
  equal(googleResult(input, data, now).isActive, true);
  equal(
    googleResult(input, {
      ...data,
      subscriptionState: "SUBSCRIPTION_STATE_CANCELED",
    }, now).isActive,
    true,
  );
  equal(
    googleResult(input, {
      ...data,
      subscriptionState: "SUBSCRIPTION_STATE_EXPIRED",
    }, now).isActive,
    false,
  );
  equal(
    googleResult(input, {
      ...data,
      subscriptionState: "SUBSCRIPTION_STATE_ON_HOLD",
    }, now).isActive,
    false,
  );
  await rejects(
    () =>
      googleResult(
        input,
        { ...data, lineItems: [{ productId: "wrong-sku" }] },
        now,
      ),
    "PLAY_PRODUCT_MISMATCH",
  );
});
Deno.test("restore links multiple anonymous UIDs to shared canonical entitlement; revocation affects same row", async () => {
  const db = new MemoryDatabase();
  const result = appleResult(ios, payload, 1, true, "Production", now);
  await persistPurchase(db, "first-install", result);
  await persistPurchase(db, "reinstall", result);
  equal(
    db.rows.get("backendEntitlements/first-install"),
    db.rows.get("backendEntitlements/reinstall"),
  );
  equal(
    [...db.rows.keys()].filter((key) =>
      key.startsWith("backendStoreEntitlements/")
    ).length,
    1,
  );
  await persistPurchase(db, "reinstall", { ...result, isActive: false });
  const link = db.rows.get("backendEntitlements/first-install")!;
  equal(
    db.rows.get(`backendStoreEntitlements/${link.storeId}`)?.isActive,
    false,
  );
});

Deno.test("Google replacement token preserves canonical quota identity and new proof", async () => {
  const db = new MemoryDatabase();
  const old = {
    platform: "android" as const,
    productId: "flexbreak_monthly_4.99",
    purchaseToken: "original-long-secret-store-token",
    canonicalId: "google:original-long-secret-store-token",
    isActive: true,
    expiryDate: "2099-01-01T00:00:00.000Z",
    purchaseDate: "2026-01-01T00:00:00.000Z",
    autoRenewing: true,
  };
  await persistPurchase(db, "old-device", old);
  const next = {
    ...old,
    productId: "flexbreak_yearly_44.99",
    purchaseToken: "upgraded-long-secret-store-token",
    canonicalId: "google:upgraded-long-secret-store-token",
    linkedPurchaseToken: old.purchaseToken,
  };
  await persistPurchase(db, "new-device", next);
  equal(
    db.rows.get("backendEntitlements/old-device"),
    db.rows.get("backendEntitlements/new-device"),
  );
  equal(
    [...db.rows.keys()].filter((key) =>
      key.startsWith("backendStoreEntitlements/")
    ).length,
    1,
  );
});

Deno.test("slow stale active validation cannot overwrite a newer refund", async () => {
  const db = new MemoryDatabase();
  const result = appleResult(ios, payload, 1, true, "Production", now);
  await persistPurchase(db, "device", {
    ...result,
    isActive: false,
    verifiedAt: now + 10,
  });
  const returned = await persistPurchase(db, "device", {
    ...result,
    isActive: true,
    verifiedAt: now,
  });
  equal(returned.isActive, false);
});

Deno.test("official Apple verifier rejects fabricated signed purchase without network", async () => {
  const { SignedDataVerifier, Environment } = await import("apple-store");
  const { Buffer } = await import("node:buffer");
  const { APPLE_ROOTS_BASE64 } = await import(
    "../functions/_shared/apple-roots.ts"
  );
  const verifier = new SignedDataVerifier(
    APPLE_ROOTS_BASE64.map((value) => Buffer.from(value, "base64")),
    true,
    Environment.PRODUCTION,
    BUNDLE,
    6743581671,
  );
  await rejects(() =>
    verifier.verifyAndDecodeTransaction(
      "eyJhbGciOiJFUzI1NiIsIng1YyI6W119.eyJwcm9kdWN0SWQiOiJmbGV4YnJlYWtfbW9udGhseV80Ljk5In0.ZmFrZQ",
    )
  );
});

Deno.test("missing Apple credentials fails 503 instead of synthetic entitlement", async () => {
  const { verifyStore } = await import("../functions/_shared/purchases.ts");
  const previous = Deno.env.get("APPLE_PRIVATE_KEY_P8");
  try {
    Deno.env.delete("APPLE_PRIVATE_KEY_P8");
    await rejects(() => verifyStore(ios), "MISSING_APPLE_PRIVATE_KEY_P8");
  } finally {
    if (previous !== undefined) Deno.env.set("APPLE_PRIVATE_KEY_P8", previous);
  }
});

Deno.test("Apple status follows allowed upgrades and verified grace expiry", async () => {
  const upgraded = appleResult(
    ios,
    { ...payload, productId: "flexbreak_yearly_44.99", expiresDate: now - 1 },
    4,
    true,
    "Production",
    now,
    now + 60000,
  );
  equal(upgraded.productId, "flexbreak_yearly_44.99");
  equal(upgraded.proofProductId, ios.productId);
  equal(upgraded.isActive, true);
  equal(upgraded.expiryDate, new Date(now + 60000).toISOString());
  equal(
    appleResult(ios, payload, 4, true, "Production", now, now - 1).isActive,
    false,
  );
  equal(
    appleResult(
      ios,
      { ...payload, revocationDate: now - 1 },
      4,
      true,
      "Production",
      now,
      now + 60000,
    ).isActive,
    false,
  );
  await rejects(
    () => appleResult(ios, payload, 4, true, "Production", now),
    "INVALID_STORE_DATES",
  );
});
Deno.test("Google grace retains access only through its verified expiry", () => {
  const input = { ...ios, platform: "android" as const };
  const data = {
    subscriptionState: "SUBSCRIPTION_STATE_IN_GRACE_PERIOD",
    startTime: new Date(now - 1000).toISOString(),
    lineItems: [{
      productId: ios.productId,
      expiryTime: new Date(now + 1000).toISOString(),
    }],
  };
  equal(googleResult(input, data, now).isActive, true);
  equal(googleResult(input, data, now + 1000).isActive, false);
});
Deno.test("premium cache shares identity, refreshes at TTL or expiry and propagates refund", async () => {
  const db = new MemoryDatabase();
  const verified = {
    ...appleResult(ios, payload, 1, true, "Production", now),
    verifiedAt: now,
  };
  await persistPurchase(db, "one", verified);
  await persistPurchase(db, "two", verified);
  let calls = 0;
  const verify = () => {
    calls++;
    return Promise.resolve({
      ...verified,
      isActive: false,
      verifiedAt: now + 900000,
    });
  };
  const first = await premiumState(db, "one", verify, now + 899999);
  equal(first.premium, true);
  equal(await premiumState(db, "two", verify, now + 899999), first);
  equal(calls, 0);
  equal((await premiumState(db, "one", verify, now + 900000)).premium, false);
  equal((await premiumState(db, "two", verify, now + 900001)).premium, false);
  equal(calls, 1);
  const short = {
    ...verified,
    canonicalId: "short",
    expiryDate: new Date(now + 100).toISOString(),
  };
  await persistPurchase(db, "short", short);
  await premiumState(db, "short", verify, now + 100);
  equal(calls, 2);
});
