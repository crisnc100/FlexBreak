import { weather, weatherInput } from "./weather.ts";
import { homeTimeZone, localCalendar } from "./timezone.ts";
import { authenticate, type Identity } from "./auth.ts";
import { type Database, database } from "./database.ts";
import { body, cors, HttpError, json } from "./http.ts";
import { reserve, spend } from "./quota.ts";
import { chat, chatInput, type ChatProvider, provider } from "./chat.ts";
import { speechInput, transcribe } from "./speech.ts";
import { verifyEmail } from "./email.ts";
import { redeem } from "./redemption.ts";
import {
  premiumState,
  purchaseInput,
  verifyPurchase,
  verifyStore,
} from "./purchases.ts";
export type Route =
  | "ai-chat-v2"
  | "transcribe-audio-v2"
  | "verify-email-v2"
  | "redeem-code-v2"
  | "verify-purchase-v2"
  | "weather-v2";
export interface Dependencies {
  authenticate?: (req: Request) => Promise<Identity>;
  database?: () => Database;
  chatProvider?: ChatProvider;
  premiumState?: typeof premiumState;
  transcribe?: typeof transcribe;
  verifyEmail?: typeof verifyEmail;
  verifyStore?: typeof verifyStore;
  weather?: typeof weather;
}
export function handler(route: Route, dependencies: Dependencies = {}) {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }
    if (req.method !== "POST") {
      return json({
        success: false,
        code: "METHOD_NOT_ALLOWED",
        error: "METHOD_NOT_ALLOWED",
      }, 405);
    }
    let releaseProject: ((success: boolean) => Promise<void>) | undefined;
    let release: ((success: boolean) => Promise<void>) | undefined;
    try {
      const identity = await (dependencies.authenticate || authenticate)(req);
      const input = await body(
        req,
        route === "transcribe-audio-v2" ? 1450000 : 32768,
      );
      const db = (dependencies.database || database)();
      // Reject an exhausted UID before charging the shared project budget.
      release = await reserve(db, identity.uid, "requests", 60);
      // Counts before any billable upstream work; survives anonymous UID churn.
      await spend(db, "project");
      releaseProject = await reserve(db, "project", "concurrency", 2000, {
        maxConcurrent: 8,
      });
      const timeZone = await homeTimeZone(db, identity.uid, input.timeZone);
      const calendar = localCalendar(timeZone);
      let data: unknown;
      if (route === "ai-chat-v2") {
        const validated = chatInput(input);
        const { premium, quotaKey } =
          await (dependencies.premiumState || premiumState)(db, identity.uid);
        if (
          validated.messages.at(-1)!.content.length > (premium ? 1000 : 500)
        ) throw new HttpError(400, "MESSAGE_TOO_LONG");
        const quotaCalendar = premium
          ? localCalendar(await homeTimeZone(db, quotaKey, timeZone))
          : calendar;
        const wednesday = quotaCalendar.wednesday;
        const done = await reserve(
          db,
          quotaKey,
          "chat",
          premium ? 15 : wednesday ? 3 : 1,
          { welcome: !premium, wednesday, day: quotaCalendar.day },
        );
        let success = false;
        try {
          data = await chat(
            validated,
            dependencies.chatProvider || provider(db),
          );
          success = true;
        } finally {
          await done(success);
        }
      } else if (route === "transcribe-audio-v2") {
        const validated = speechInput(input);
        const { premium, quotaKey } =
          await (dependencies.premiumState || premiumState)(db, identity.uid);
        const quotaCalendar = premium
          ? localCalendar(await homeTimeZone(db, quotaKey, timeZone))
          : calendar;
        const done = await reserve(db, quotaKey, "speech", premium ? 15 : 3, {
          day: quotaCalendar.day,
        });
        let success = false;
        try {
          await spend(db, "speech");
          data = await (dependencies.transcribe || transcribe)(validated);
          success = true;
        } finally {
          await done(success);
        }
      } else if (route === "verify-email-v2") {
        data = await (dependencies.verifyEmail || verifyEmail)(
          db,
          identity.uid,
          input,
        );
      } else if (route === "redeem-code-v2") {
        data = await redeem(db, identity, input);
      } else if (route === "weather-v2") {
        const validated = weatherInput(input);
        const done = await reserve(db, identity.uid, "weather", 24);
        let success = false;
        try {
          await spend(db, "weather");
          data = await (dependencies.weather || weather)(validated);
          success = true;
        } finally {
          await done(success);
        }
      } else {
        const validated = purchaseInput(input);
        await spend(db, validated.platform === "ios" ? "apple" : "googleplay");
        data = await verifyPurchase(
          db,
          identity.uid,
          validated,
          dependencies.verifyStore || verifyStore,
        );
      }
      return json({ success: true, data });
    } catch (error) {
      const known = error instanceof HttpError;
      const status = known ? error.status : 503;
      const code = known ? error.code : "SERVICE_UNAVAILABLE";
      // Never serialize upstream exceptions, credentials, receipt bodies or email.
      return json({ success: false, code, error: code }, status);
    } finally {
      if (releaseProject) {
        try {
          await releaseProject(true);
        } catch { /* Expiring lease remains counted on failed cleanup. */ }
      }
      if (release) {
        try {
          await release(true);
        } catch {
          /* Lease expires; attempt remains charged if persistence is unavailable. */
        }
      }
    }
  };
}
