import {
  decodeProtectedHeader,
  importX509,
  jwtVerify,
  type JWTVerifyGetKey,
} from "jose";
import { HttpError } from "./http.ts";
export const PROJECT = "flexbreak-28ad0";
// Refresh once for a new kid, but bound attacker-triggered refreshes per isolate.
export function certificateKey(
  fetcher: typeof fetch = fetch,
  clock = Date.now,
): JWTVerifyGetKey {
  let certificates: Record<string, string> = {};
  let expires = 0;
  let lastRefresh = -Infinity;
  let refreshing: Promise<void> | undefined;
  const refresh = () => {
    refreshing ??= (async () => {
      try {
        const response = await fetcher(
          "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com",
          { signal: AbortSignal.timeout(5000) },
        );
        if (!response.ok) throw new Error("status");
        const next = await response.json();
        if (
          !next || typeof next !== "object" || Array.isArray(next) ||
          !Object.values(next).every((value) => typeof value === "string")
        ) {
          throw new Error("certificates");
        }
        certificates = next;
        const maxAge = Number(
          response.headers.get("cache-control")?.match(/max-age=(\d+)/)?.[1] ||
            300,
        );
        lastRefresh = clock();
        expires = lastRefresh + Math.min(maxAge, 3600) * 1000;
      } catch {
        throw new HttpError(503, "AUTH_CERTIFICATES_UNAVAILABLE");
      }
    })().finally(() => {
      refreshing = undefined;
    });
    return refreshing;
  };
  return async (header) => {
    if (header.alg !== "RS256" || typeof header.kid !== "string") {
      throw new HttpError(401, "INVALID_TOKEN");
    }
    if (clock() >= expires) await refresh();
    else if (!certificates[header.kid] && clock() - lastRefresh >= 60000) {
      await refresh();
    }
    if (!certificates[header.kid]) {
      throw new HttpError(401, "UNKNOWN_SIGNING_KEY");
    }
    return importX509(certificates[header.kid], "RS256");
  };
}
const googleKey = certificateKey();
export interface Identity {
  uid: string;
  email?: string;
  emailVerified: boolean;
}
export async function authenticate(
  req: Request,
  key: JWTVerifyGetKey = googleKey,
  now = new Date(),
): Promise<Identity> {
  const authorization = req.headers.get("authorization") || "";
  if (!/^Bearer [^ ]+$/.test(authorization) || authorization.length > 9000) {
    throw new HttpError(401, "AUTH_REQUIRED");
  }
  const token = authorization.slice(7);
  try {
    const header = decodeProtectedHeader(token);
    if (!header.kid || header.alg !== "RS256") throw new Error("header");
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["RS256"],
      issuer: `https://securetoken.google.com/${PROJECT}`,
      audience: PROJECT,
      currentDate: now,
      clockTolerance: 60,
      requiredClaims: ["exp", "iat", "sub", "auth_time"],
    });
    const current = Math.floor(now.getTime() / 1000);
    if (
      !payload.sub || payload.sub.length > 128 || payload.sub.includes("/") ||
      typeof payload.iat !== "number" || payload.iat > current + 60 ||
      typeof payload.auth_time !== "number" || payload.auth_time > current + 60
    ) throw new Error("claims");
    return {
      uid: payload.sub,
      email: typeof payload.email === "string" ? payload.email : undefined,
      emailVerified: payload.email_verified === true,
    };
  } catch (error) {
    if (error instanceof HttpError && error.status === 503) throw error;
    throw new HttpError(401, "INVALID_TOKEN");
  }
}
