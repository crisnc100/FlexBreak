import {
  AppStoreServerAPIClient,
  Environment,
  SignedDataVerifier,
  VerificationException,
  VerificationStatus,
} from "apple-store";
import nodeFetch from "node-fetch";
import type { URLSearchParams as NodeURLSearchParams } from "node:url";
import { Buffer } from "node:buffer";
import { importPKCS8, SignJWT } from "jose";
import { APPLE_ROOTS_BASE64 } from "./apple-roots.ts";
import { env, fetchJSON, HttpError, object, text } from "./http.ts";
import { spend } from "./quota.ts";
import { type Database, hash, type Row } from "./database.ts";

class BoundedAppleClient extends AppStoreServerAPIClient {
  constructor(
    key: string,
    keyId: string,
    issuer: string,
    bundle: string,
    private readonly storeEnvironment: Environment,
  ) {
    super(key, keyId, issuer, bundle, storeEnvironment);
  }
  protected override makeFetchRequest(
    path: string,
    query: NodeURLSearchParams,
    method: string,
    requestBody: string | Buffer | undefined,
    headers: Record<string, string>,
  ) {
    const origin = this.storeEnvironment === Environment.PRODUCTION
      ? "https://api.storekit.itunes.apple.com"
      : "https://api.storekit-sandbox.itunes.apple.com";
    return nodeFetch(`${origin}${path}?${query}`, {
      method,
      body: requestBody,
      headers,
      timeout: 15000,
      size: 1048576,
    });
  }
}

export const BUNDLE = "com.cristianortega.flexbreak";
export const PRODUCTS = [
  "flexbreak_monthly_4.99",
  "flexbreak_yearly_44.99",
  "flexbreak_monthly_verified",
  "flexbreak_yearly_verified",
];
export interface PurchaseInput {
  platform: "ios" | "android";
  productId: string;
  purchaseToken: string;
  transactionId?: string;
}
export interface VerifiedPurchase extends PurchaseInput {
  canonicalId: string;
  isActive: boolean;
  expiryDate: string;
  autoRenewing: boolean;
  purchaseDate: string;
  linkedPurchaseToken?: string;
  verifiedAt?: number;
  proofProductId?: string;
}
export function purchaseInput(input: Row): PurchaseInput {
  const productId = text(input.productId, 100, "PRODUCT");
  if (!PRODUCTS.includes(productId)) {
    throw new HttpError(400, "PRODUCT_NOT_ALLOWED");
  }
  if (input.platform !== "ios" && input.platform !== "android") {
    throw new HttpError(400, "INVALID_PLATFORM");
  }
  const purchaseToken = text(input.purchaseToken, 24000, "PURCHASE_PROOF");
  if (input.platform === "ios" && purchaseToken.split(".").length !== 3) {
    throw new HttpError(400, "SIGNED_STOREKIT_PROOF_REQUIRED");
  }
  if (
    input.platform === "android" &&
    (purchaseToken.length < 32 || !/^[A-Za-z0-9._:-]+$/.test(purchaseToken))
  ) throw new HttpError(400, "INVALID_PLAY_TOKEN");
  return {
    platform: input.platform,
    productId,
    purchaseToken,
    ...(input.transactionId === undefined
      ? {}
      : { transactionId: text(input.transactionId, 100, "TRANSACTION") }),
  };
}
// Called only with Apple signature-verified server transaction data.
export function appleResult(
  input: PurchaseInput,
  payload: Row,
  status: number,
  autoRenew: boolean,
  environment: string,
  now = Date.now(),
  graceExpiry?: number,
): VerifiedPurchase {
  if (
    payload.bundleId !== BUNDLE ||
    !PRODUCTS.includes(String(payload.productId)) ||
    payload.environment !== environment ||
    typeof payload.originalTransactionId !== "string"
  ) throw new HttpError(422, "APPLE_PURCHASE_MISMATCH");
  const expiry = status === 4
    ? Number(graceExpiry)
    : Number(payload.expiresDate);
  const purchased = Number(payload.purchaseDate);
  if (
    !Number.isFinite(expiry) || !Number.isFinite(purchased) || purchased > now
  ) throw new HttpError(422, "INVALID_STORE_DATES");
  return {
    ...input,
    productId: String(payload.productId),
    proofProductId: input.productId,
    canonicalId: `apple:${environment}:${payload.originalTransactionId}`,
    isActive: [1, 4].includes(status) && !payload.revocationDate &&
      expiry > now,
    expiryDate: new Date(expiry).toISOString(),
    purchaseDate: new Date(purchased).toISOString(),
    autoRenewing: autoRenew,
  };
}
async function apple(input: PurchaseInput): Promise<VerifiedPurchase> {
  const key = env("APPLE_PRIVATE_KEY_P8").replace(/\\n/g, "\n");
  const keyId = env("APPLE_KEY_ID");
  const issuer = env("APPLE_ISSUER_ID");
  const appId = Number(env("APPLE_APP_ID"));
  if (appId !== 6743581671) throw new HttpError(503, "APPLE_APP_ID_MISMATCH");
  const roots = APPLE_ROOTS_BASE64.map((value) => Buffer.from(value, "base64"));
  const environments = Deno.env.get("APPLE_ALLOW_SANDBOX") === "true"
    ? [Environment.PRODUCTION, Environment.SANDBOX]
    : [Environment.PRODUCTION];
  let selected: {
    verifier: SignedDataVerifier;
    environment: Environment;
    original: string;
  } | undefined;
  for (const environment of environments) {
    const verifier = new SignedDataVerifier(
      roots,
      true,
      environment,
      BUNDLE,
      appId,
    );
    try {
      const proof = await verifier.verifyAndDecodeTransaction(
        input.purchaseToken,
      );
      if (
        proof.bundleId !== BUNDLE || proof.productId !== input.productId ||
        !proof.originalTransactionId ||
        (input.transactionId && proof.transactionId !== input.transactionId)
      ) throw new Error("mismatch");
      selected = {
        verifier,
        environment,
        original: proof.originalTransactionId,
      };
      break;
    } catch (error) {
      if (
        error instanceof VerificationException &&
        error.status === VerificationStatus.RETRYABLE_VERIFICATION_FAILURE
      ) throw new HttpError(503, "APPLE_SIGNATURE_SERVICE_UNAVAILABLE");
      // Try only explicitly configured environments, never decoded-only JWS.
    }
  }
  if (!selected) throw new HttpError(422, "INVALID_APPLE_SIGNATURE");
  const { verifier, environment, original } = selected;
  const client = new BoundedAppleClient(
    key,
    keyId,
    issuer,
    BUNDLE,
    environment,
  );
  let status;
  try {
    status = await client.getAllSubscriptionStatuses(original);
  } catch {
    throw new HttpError(503, "APPLE_STATUS_UNAVAILABLE");
  }
  const candidates: VerifiedPurchase[] = [];
  for (const group of status.data || []) {
    for (const transaction of group.lastTransactions || []) {
      if (
        !transaction.signedTransactionInfo ||
        transaction.originalTransactionId !== original
      ) continue;
      const decoded = await verifier.verifyAndDecodeTransaction(
        transaction.signedTransactionInfo,
      );
      if (
        decoded.originalTransactionId !== original ||
        !PRODUCTS.includes(String(decoded.productId))
      ) continue;
      const renewal = transaction.signedRenewalInfo
        ? await verifier.verifyAndDecodeRenewalInfo(
          transaction.signedRenewalInfo,
        )
        : undefined;
      if (renewal && renewal.originalTransactionId !== original) {
        throw new HttpError(422, "APPLE_RENEWAL_MISMATCH");
      }
      candidates.push(
        appleResult(
          input,
          decoded as unknown as Row,
          Number(transaction.status),
          renewal?.autoRenewStatus === 1,
          environment,
          Date.now(),
          renewal?.gracePeriodExpiresDate,
        ),
      );
    }
  }
  candidates.sort((a, b) =>
    Date.parse(b.expiryDate) - Date.parse(a.expiryDate)
  );
  if (!candidates.length) throw new HttpError(422, "SUBSCRIPTION_NOT_FOUND");
  return candidates[0];
}
async function playAccessToken(): Promise<string> {
  const raw = Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON") ||
    atob(env("GOOGLE_PLAY_SERVICE_ACCOUNT_BASE64"));
  let service;
  try {
    service = object(JSON.parse(raw));
  } catch {
    throw new HttpError(503, "INVALID_PLAY_CREDENTIAL");
  }
  const email = text(service.client_email, 254, "PLAY_SERVICE_EMAIL");
  const privateKey = await importPKCS8(
    text(service.private_key, 10000, "PLAY_PRIVATE_KEY"),
    "RS256",
  );
  const assertion = await new SignJWT({
    scope: "https://www.googleapis.com/auth/androidpublisher",
  }).setProtectedHeader({ alg: "RS256" }).setIssuer(email).setAudience(
    "https://oauth2.googleapis.com/token",
  ).setIssuedAt().setExpirationTime("5m").sign(privateKey);
  const data = await fetchJSON("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (typeof data.access_token !== "string") {
    throw new HttpError(503, "PLAY_AUTH_UNAVAILABLE");
  }
  return data.access_token;
}
// Called only with authenticated subscriptionsv2.get response for configured package.
export function googleResult(
  input: PurchaseInput,
  payload: Row,
  now = Date.now(),
): VerifiedPurchase {
  const line = (Array.isArray(payload.lineItems) ? payload.lineItems : []).map(
    object,
  ).find((item) => item.productId === input.productId);
  if (!line) throw new HttpError(422, "PLAY_PRODUCT_MISMATCH");
  const expiry = Date.parse(String(line.expiryTime));
  const purchased = Date.parse(String(payload.startTime));
  if (
    !Number.isFinite(expiry) || !Number.isFinite(purchased) || purchased > now
  ) throw new HttpError(422, "INVALID_STORE_DATES");
  if (
    payload.testPurchase &&
    Deno.env.get("GOOGLE_ALLOW_TEST_PURCHASES") !== "true"
  ) throw new HttpError(422, "TEST_PURCHASE_NOT_ALLOWED");
  const autoRenewing = line.autoRenewingPlan &&
    object(line.autoRenewingPlan).autoRenewEnabled === true;
  return {
    ...input,
    ...(typeof payload.linkedPurchaseToken === "string"
      ? { linkedPurchaseToken: payload.linkedPurchaseToken }
      : {}),
    canonicalId: `google:${input.purchaseToken}`,
    isActive: [
      "SUBSCRIPTION_STATE_ACTIVE",
      "SUBSCRIPTION_STATE_CANCELED",
      "SUBSCRIPTION_STATE_IN_GRACE_PERIOD",
    ].includes(
      String(payload.subscriptionState),
    ) && expiry > now,
    expiryDate: new Date(expiry).toISOString(),
    purchaseDate: new Date(purchased).toISOString(),
    autoRenewing: Boolean(autoRenewing),
  };
}
async function google(input: PurchaseInput): Promise<VerifiedPurchase> {
  const accessToken = await playAccessToken();
  const data = await fetchJSON(
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${BUNDLE}/purchases/subscriptionsv2/tokens/${
      encodeURIComponent(input.purchaseToken)
    }`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  return googleResult(input, data);
}
export const verifyStore = async (
  input: PurchaseInput,
): Promise<VerifiedPurchase> => {
  const verifiedAt = Date.now();
  return {
    ...(await (input.platform === "ios" ? apple(input) : google(input))),
    verifiedAt,
  };
};
export async function persistPurchase(
  db: Database,
  uid: string,
  verified: VerifiedPurchase,
) {
  const tokenId = await hash(verified.canonicalId);
  const previousTokenId =
    verified.platform === "android" && verified.linkedPurchaseToken
      ? await hash(`google:${verified.linkedPurchaseToken}`)
      : undefined;
  // Authenticated Google linkedPurchaseToken metadata lets normal replacements
  // share the existing canonical identity without trusting a client-supplied link.
  const stored = await db.transaction(async (tx) => {
    const currentAlias = verified.platform === "android"
      ? await tx.get(`backendStoreAliases/${tokenId}`)
      : undefined;
    if (currentAlias?.superseded === true) {
      throw new HttpError(503, "LATEST_PURCHASE_PROOF_REQUIRED");
    }
    const previousAlias = previousTokenId
      ? await tx.get(`backendStoreAliases/${previousTokenId}`)
      : undefined;
    const storeId = String(
      currentAlias?.storeId || previousAlias?.storeId || previousTokenId ||
        tokenId,
    );
    const previous = await tx.get(`backendStoreEntitlements/${storeId}`);
    const updated = {
      ...verified,
      canonicalId: storeId,
      checkedAt: verified.verifiedAt ?? Date.now(),
    };
    const latest = previous &&
        (Number(previous.checkedAt || 0) > updated.checkedAt ||
          (Number(previous.checkedAt || 0) === updated.checkedAt &&
            previous.isActive === false))
      ? previous
      : updated;
    tx.set(`backendStoreEntitlements/${storeId}`, latest);
    if (verified.platform === "android") {
      tx.set(`backendStoreAliases/${tokenId}`, { storeId });
      if (previousTokenId) {
        tx.set(`backendStoreAliases/${previousTokenId}`, {
          ...(previousAlias || {}),
          storeId,
          superseded: true,
        });
      }
    }
    tx.set(`backendEntitlements/${uid}`, { storeId });
    return latest;
  });
  if (
    typeof stored.expiryDate !== "string" ||
    typeof stored.purchaseDate !== "string" ||
    typeof stored.productId !== "string" ||
    (stored.platform !== "ios" && stored.platform !== "android")
  ) throw new HttpError(503, "INVALID_STORED_ENTITLEMENT");
  return {
    productId: stored.productId,
    platform: stored.platform,
    isActive: stored.isActive === true,
    expiryDate: stored.expiryDate,
    purchaseDate: stored.purchaseDate,
    autoRenewing: stored.autoRenewing === true,
    purchaseToken: verified.purchaseToken,
  };
}
// A previously authenticated Play token remains bearer evidence for its linked
// replacement. Re-verify the current proof live rather than return cached grants
// or let an old canceled token overwrite a newer paid plan.
export async function verifyPurchase(
  db: Database,
  uid: string,
  input: PurchaseInput,
  verify = verifyStore,
) {
  let proof = input;
  if (input.platform === "android") {
    const alias = await db.get(
      `backendStoreAliases/${await hash(`google:${input.purchaseToken}`)}`,
    );
    if (alias?.superseded === true && typeof alias.storeId === "string") {
      const latest = await db.get(`backendStoreEntitlements/${alias.storeId}`);
      if (!latest) throw new HttpError(503, "STORE_LINK_UNAVAILABLE");
      proof = purchaseInput(latest);
    }
  }
  const result = await persistPurchase(db, uid, await verify(proof));
  return { ...result, purchaseToken: input.purchaseToken };
}

export async function premiumState(
  db: Database,
  uid: string,
  verify = verifyStore,
  now = Date.now(),
): Promise<{ premium: boolean; quotaKey: string }> {
  const [grant, link] = await Promise.all([
    db.get(`backendGrants/${uid}`),
    db.get(`backendEntitlements/${uid}`),
  ]);
  if (
    grant?.isActive === true &&
    Date.parse(String(grant.expiryDate)) > now
  ) return { premium: true, quotaKey: uid };
  if (typeof link?.storeId !== "string") {
    return { premium: false, quotaKey: uid };
  }
  const saved = await db.get(`backendStoreEntitlements/${link.storeId}`);
  if (!saved) return { premium: false, quotaKey: uid };
  const age = now - Number(saved.checkedAt);
  const futureExpiry = Date.parse(String(saved.expiryDate)) > now;
  // Bound refund latency to fifteen minutes, never beyond verified expiry.
  if (
    age >= 0 && age < 15 * 60000 && (futureExpiry || saved.isActive === false)
  ) {
    const premium = saved.isActive === true && futureExpiry;
    return { premium, quotaKey: premium ? link.storeId : uid };
  }
  // Long inactive subscriptions require explicit Restore to resume access.
  if (saved.isActive === false && age > 3 * 86400000) {
    return { premium: false, quotaKey: uid };
  }
  const proof = purchaseInput({
    ...saved,
    productId: saved.proofProductId ?? saved.productId,
  });
  await spend(db, proof.platform === "ios" ? "apple" : "googleplay");
  const verified = await verify(proof);
  const latest = await persistPurchase(db, uid, verified);
  const canonical = await db.get(`backendEntitlements/${uid}`);
  return {
    premium: latest.isActive === true,
    quotaKey: latest.isActive === true ? String(canonical!.storeId) : uid,
  };
}
