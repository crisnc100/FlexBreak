import { env, fetchJSON, HttpError } from "./http.ts";
import { spend } from "./quota.ts";
import { emailAddress } from "./redemption.ts";
import { type Database, hash } from "./database.ts";
const personal = [
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "aol.com",
  "protonmail.com",
  "tutanota.com",
  "mail.com",
  "zoho.com",
  "yandex.com",
];
const disposable = [
  "10minutemail",
  "guerrillamail",
  "mailinator",
  "tempmail",
  "yopmail",
  "throwaway",
  "burner",
  "33mail",
  "jetable",
];
export function qualification(
  email: string,
  validation: Record<string, unknown>,
) {
  const domain = email.split("@")[1];
  if (
    personal.includes(domain) ||
    disposable.some((pattern) => email.includes(pattern))
  ) return false;
  return ["valid", "catch-all"].includes(String(validation.status)) &&
    !["role_based", "disposable"].includes(String(validation.sub_status)) &&
    validation.free_email === false;
}
export async function qualifyEmail(
  input: Record<string, unknown>,
  beforeBillable: () => Promise<void>,
) {
  const email = emailAddress(input.email);
  const domain = email.split("@")[1];
  if (
    personal.includes(domain) ||
    disposable.some((pattern) => email.includes(pattern))
  ) {
    return {
      status: "rejected",
      message: "Please use your work or school email.",
    };
  }
  const key = env("ZEROBOUNCE_API_KEY");
  await beforeBillable();
  let validation: Record<string, unknown>;
  try {
    validation = await fetchJSON(
      `https://api.zerobounce.net/v2/validate?api_key=${
        encodeURIComponent(key)
      }&email=${encodeURIComponent(email)}`,
      { method: "GET" },
    );
  } catch {
    throw new HttpError(503, "EMAIL_VERIFICATION_UNAVAILABLE");
  }
  if (!qualification(email, validation)) {
    return {
      status: "rejected",
      message:
        "This email could not be verified as a valid work or school email.",
    };
  }
  return {
    status: "approved",
    message: "Work email verified.",
    discountType: "office",
    company: domain,
    details: { email, domain, isBusinessEmail: true, validationScore: 1 },
  };
}

export async function verifyEmail(
  db: Database,
  uid: string,
  input: Record<string, unknown>,
) {
  const result = await qualifyEmail(input, () => spend(db, "zerobounce"));
  if (result.status !== "approved") return result;
  const email = emailAddress(input.email);
  const emailKey = await hash(email);
  return db.transaction(async (tx) => {
    const previous = await tx.get(`backendEmailClaims/${emailKey}`);
    const user = await tx.get(`backendVerifications/${uid}`);
    if ((previous && previous.uid !== uid) || (user && user.email !== email)) {
      return {
        status: "already_used",
        message: "This verification has already been used.",
      };
    }
    tx.set(`backendEmailClaims/${emailKey}`, {
      uid,
      verifiedAt: new Date().toISOString(),
    });
    tx.set(`backendVerifications/${uid}`, {
      email,
      userType: "office",
      method: "zerobounce",
      verifiedAt: new Date().toISOString(),
    });
    return result;
  });
}
