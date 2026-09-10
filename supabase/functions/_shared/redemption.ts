import type { Database, Row } from "./database.ts";
import { hash } from "./database.ts";
import type { Identity } from "./auth.ts";
import { HttpError, text } from "./http.ts";
export function emailAddress(value: unknown): string {
  const email = text(value, 254, "EMAIL").trim().toLowerCase();
  if (
    !/^[^\s@/]+@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/.test(email)
  ) throw new HttpError(400, "INVALID_EMAIL");
  return email;
}
export function codeExpiry(record: Row): number {
  const timestamp = record.expiresAtTimestamp;
  // Match rules: a present timestamp is authoritative, including when expired.
  return timestamp !== undefined
    ? timestamp && typeof timestamp === "object" &&
        "toMillis" in timestamp && typeof timestamp.toMillis === "function"
      ? Number(timestamp.toMillis())
      : NaN
    : Date.parse(String(record.expiresAt));
}
export async function redeem(
  db: Database,
  identity: Identity,
  input: Row,
  now = Date.now(),
) {
  const code = text(input.code, 80, "CODE").trim().toUpperCase();
  if (!/^[A-Z0-9-]{4,80}$/.test(code)) throw new HttpError(400, "INVALID_CODE");
  const email = emailAddress(input.email);
  const emailKey = await hash(email);
  return db.transaction(async (tx) => {
    const path = `oneTimeCodes/${code}`;
    const record = await tx.get(path);
    if (!record) throw new HttpError(404, "INVALID_CODE");
    if (record.used) {
      if (record.usedByUid === identity.uid && record.result) {
        return record.result;
      }
      throw new HttpError(409, "CODE_ALREADY_USED");
    }
    const expires = codeExpiry(record);
    if (!Number.isFinite(expires) || expires <= now) {
      throw new HttpError(410, "CODE_EXPIRED");
    }
    // Existing family/promo codes remain transferable. Only explicitly policy-
    // bound codes enforce a verified Firebase email; a legacy email field does not.
    if (
      record.emailBindingPolicy === "verified_email" &&
      (!identity.emailVerified ||
        identity.email?.toLowerCase() !== String(record.email).toLowerCase() ||
        email !== identity.email.toLowerCase())
    ) throw new HttpError(403, "CODE_EMAIL_MISMATCH");
    if (
      record.emailBindingPolicy !== undefined &&
      record.emailBindingPolicy !== "transferable" &&
      record.emailBindingPolicy !== "verified_email"
    ) throw new HttpError(503, "UNKNOWN_CODE_POLICY");
    const verification = await tx.get(`backendVerifications/${identity.uid}`);
    const emailOwner = await tx.get(`backendEmailClaims/${emailKey}`);
    if (verification || (emailOwner && emailOwner.uid !== identity.uid)) {
      throw new HttpError(409, "ALREADY_VERIFIED");
    }
    const codeType = record.type ?? "discount";
    if (codeType !== "discount" && codeType !== "free_premium") {
      throw new HttpError(503, "INVALID_CODE_TYPE");
    }
    const days = record.duration ?? 365;
    if (
      codeType === "free_premium" &&
      (!Number.isInteger(days) || Number(days) < 1 || Number(days) > 3650)
    ) throw new HttpError(503, "INVALID_CODE_DURATION");
    const result: Row = codeType === "free_premium"
      ? {
        codeType,
        premiumDuration: days,
        expiryDate: new Date(now + Number(days) * 86400000).toISOString(),
        message:
          `Congratulations! You have ${days} days of FREE premium access!`,
      }
      : {
        codeType,
        discountType: "office",
        message: "Verification successful! 60% discount activated.",
      };
    tx.set(path, {
      ...record,
      used: true,
      usedBy: email,
      usedByUid: identity.uid,
      usedAt: new Date(now).toISOString(),
      result,
    });
    tx.set(`backendVerifications/${identity.uid}`, {
      email,
      userType: codeType === "discount" ? "office" : "premium",
      method: "code",
      code,
      verifiedAt: new Date(now).toISOString(),
    });
    tx.set(`backendEmailClaims/${emailKey}`, {
      uid: identity.uid,
      verifiedAt: new Date(now).toISOString(),
    });
    if (codeType === "free_premium") {
      tx.set(`backendGrants/${identity.uid}`, {
        type: "code",
        isActive: true,
        expiryDate: result.expiryDate,
        code,
      });
    }
    return result;
  });
}
