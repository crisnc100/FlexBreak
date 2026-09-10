// Phase-0 compatibility only. No claim of user authentication: deployed old
// clients have no Firebase token. Aggregate caps are shared with v2.
import { type Database, database } from "./database.ts";
import { body, cors, HttpError, json, object } from "./http.ts";
import { chat, chatInput, provider } from "./chat.ts";
import { qualifyEmail } from "./email.ts";
import { legacySpeechInput, transcribe } from "./speech.ts";
import { reserve, spend } from "./quota.ts";
export type LegacyRoute =
  | "ai-chat"
  | "ai-chat-firebase"
  | "transcribe-audio"
  | "verify-email";
export interface LegacyDependencies {
  database?: () => Database;
  enabled?: () => boolean;
  chat?: typeof chat;
  transcribe?: typeof transcribe;
  qualifyEmail?: typeof qualifyEmail;
}
export function legacyHandler(
  route: LegacyRoute,
  dependencies: LegacyDependencies = {},
) {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }
    if (req.method !== "POST") {
      return json({ success: false, error: "METHOD_NOT_ALLOWED" }, 405);
    }
    let release: ((success: boolean) => Promise<void>) | undefined;
    try {
      if (
        !(dependencies.enabled?.() ??
          Deno.env.get("LEGACY_PROXY_ENABLED") === "true")
      ) throw new HttpError(503, "LEGACY_PROXY_DISABLED");
      const input = await body(
        req,
        route === "transcribe-audio" ? 1450000 : 32768,
      );
      const db = (dependencies.database || database)();
      await spend(db, "legacy");
      await spend(db, "project");
      release = await reserve(db, "project", "concurrency", 2000, {
        maxConcurrent: 8,
      });
      if (route === "ai-chat" || route === "ai-chat-firebase") {
        // Keep old app model labels compatible, but they cannot select provider
        // cost/behavior: every request is mapped to the bounded server routing.
        const options = input.options === undefined
          ? {}
          : object(input.options);
        const legacyAliases = [
          "meta-llama/llama-3.1-8b-instruct:free",
          "mistralai/mistral-7b-instruct:free",
          "mistralai/mistral-7b-instruct",
          "anthropic/claude-3-haiku",
          "llama3-8b-8192",
        ];
        const safeInput = {
          ...input,
          options: {
            ...options,
            ...(legacyAliases.includes(String(options.model))
              ? { model: "meta-llama/llama-3.1-8b-instruct" }
              : {}),
          },
        };
        const result = await (dependencies.chat || chat)(
          chatInput(safeInput),
          provider(db),
        );
        return json({ success: true, data: result });
      }
      if (route === "transcribe-audio") {
        // Old WAV/AMR payload names accepted; unsupported/mislabeled CAF never
        // sent to Google. WEBM_OPUS is validated below for old Android recordings.
        await spend(db, "speech");
        const result = await (dependencies.transcribe || transcribe)(
          legacySpeechInput(input),
        );
        return json({ success: true, ...result });
      }
      return json(
        await (dependencies.qualifyEmail || qualifyEmail)(
          input,
          () => spend(db, "zerobounce"),
        ),
      );
    } catch (error) {
      const code = error instanceof HttpError
        ? error.code
        : "SERVICE_UNAVAILABLE";
      return json(
        route === "verify-email"
          ? { status: "error", message: code }
          : { success: false, error: code },
        error instanceof HttpError ? error.status : 503,
      );
    } finally {
      if (release) {
        try {
          await release(true);
        } catch { /* Lease expires; failed cleanup never refunds attempts. */ }
      }
    }
  };
}
