# FlexBreak server functions

Versioned Firebase-authenticated Supabase Edge Functions, plus separate phase-0 compatibility handlers for installed clients. **Prepared locally; nothing here has been deployed.** The downloaded previous deployments remain in ignored `.artifacts/deployed/functions` for comparison/rollback. No privileged live data was read or changed while implementing these functions.

## Runtime and checks

Deno 2.9.6; strict Deno configuration lives here because the React Native compiler cannot type-check a Deno runtime. Dependencies are exact-pinned in `deno.json` and transitively locked in `deno.lock`. Root CI must run both checks, in addition to app checks:

```sh
npm exec --yes --package=deno@2.9.6 -- deno task --config supabase/deno.json check
npm exec --yes --package=deno@2.9.6 -- deno task --config supabase/deno.json test
```

Final local validation: strict Deno check PASS, Deno lint PASS (31 TypeScript files), 34 tests PASS / 0 failed. Tests have no network permission. They execute actual auth, handlers, input policies, quota/redemption transactions and purchase policies with controlled collaborators. Firebase token tests use real RSA signatures; an Apple test uses the official verifier to reject fabricated proof. Success-path Apple/Google store responses are fixture-backed after the verifier boundary; real StoreKit/Play credentials and purchase fixtures are still required for staging end-to-end verification. Transaction concurrency is checked through a serialized in-memory transaction adapter, **not a claim that a Firestore emulator or production contention was tested**. Production uses firebase-admin Firestore REST transactions; no process-local quota maps.

## v2 request contract

POST JSON only. `Authorization: Bearer <Firebase ID token>` and the public Supabase anon `apikey`. The gateway uses `verify_jwt=false` because these are Firebase JWTs, **not** Supabase JWTs; every v2 handler itself verifies RS256 signature, Google certificate kid, Firebase issuer/audience `flexbreak-28ad0`, expiry, issued-at, auth-time and nonempty bounded UID. Anonymous Firebase sign-in tokens are supported. Never send provider/server credentials in the app.

All payloads include `timeZone`, an IANA timezone from the device. It is validated and persisted once per UID. Later requests cannot change it. Premium store-linked devices also share one persisted canonical entitlement timezone, so rotating UIDs/timezones cannot reset their paid allowance. Free Wednesday access is based on this home timezone. Travel/account-timezone changes require a future server-controlled migration; they are intentionally not client-settable. Global budgets use UTC days/months.

Response: `{success:true,data:...}`. Errors: non-2xx `{success:false,code:"...",error:"..."}`. No stack, provider exception, receipt or credential is logged/serialized. A purchase response echoes only the submitting client's proof as required by the client contract; canonical stored proofs are never exposed through a read endpoint.

| Function | Body fields beyond timeZone | data |
|---|---|---|
| weather-v2 | lat, lon, kind:"current" or "forecast" | unchanged OpenWeather response JSON |
| ai-chat-v2 | messages, options? | string |
| transcribe-audio-v2 | audioContent, languageCode?, encoding, sampleRateHertz | `{text,detectedLanguage}` |
| verify-email-v2 | email | `{status,message,discountType?,details?}` |
| redeem-code-v2 | code, email | `{codeType,message,discountType?}` or `{codeType:"free_premium",premiumDuration,expiryDate,message}` |
| verify-purchase-v2 | platform, productId, purchaseToken, transactionId? | `{productId,isActive,expiryDate,autoRenewing,platform,purchaseToken,purchaseDate}` |

Client-supplied userId, premium, entitlement/expiry or arbitrary models never control authorization. Email qualification grants a discount classification only; it never grants a paid subscription. The recovered backend qualifies work email (including valid catch-all) and has no distinct student-domain approval algorithm; existing discount-code default remains office. No new guessed student or business-domain policy was invented. ZeroBounce unavailability fails 503 instead of guessing approval.

## Hard limits

- JSON streams are measured, including absent/false Content-Length: 32 KiB normal; 1.45 MB audio. Provider JSON responses capped at 1 MiB with timed fetches.
- Chat: 1–16 messages, 20,000 total characters, at most 12,000 system-message characters / 2,000 per other message; actual final user prompt is max 500 free / 1,000 premium. Requests for maxTokens above 500 are rejected; server sends at most 300, with one continuation at most 200. Temperature 0–1. No tools, arbitrary URLs, or arbitrary provider/model selection.
- Server models: OpenRouter `meta-llama/llama-3.1-8b-instruct`, Groq `openai/gpt-oss-20b`. Provider-first fallback and one bounded continuation are preserved; worst case four provider attempts. Old client model names are mapped only in legacy handlers. The new client should omit model or use this allowlist.
- Free AI: one first successful welcome session outside Wednesday; 3 on Wednesdays. Premium: 15 daily sessions. Failed providers refund the session reservation, but attempt counts remain bounded at max(10,3×session limit). Successful upstream work counts even if the client later disconnects.
- Speech: iOS RIFF/WAV PCM16 mono 16kHz; Android AMR-WB mono 16kHz; actual file headers/frame structure validated, maximum 30 seconds and 1 MiB. Six explicit English/Spanish/Chinese locale codes; `latest_short`, alternative Spanish/Chinese, no punctuation/word timestamps, as in prior source. Never label AAC/CAF as WebM/PCM.
- One in-flight request per UID; one AI/speech lease per canonical quota identity; eight project-wide in-flight leases. Leases expire after 180 seconds for crash recovery. Provider fetches are bounded (15 seconds normally, speech 20 seconds). Apple uses its official OCSP checking (30-second library bound) plus a bounded 15-second API transport. Client timeout needs to accommodate store checks/fallback.
- UID request ceiling: 60/day. **Project and each provider**: 500 attempts/day and 5,000/month by default. These aggregate transactional counters prevent UID recreation from multiplying the entire project's billable request allowance. Server env can lower/raise defaults only up to hard ceilings 2,000/day and 20,000/month. Counts are not refunded after failure because upstream timeouts can still incur charges. These are hard request/token/audio bounds, not a claim of an exact dollar invoice cap; provider pricing/billing limits must also be configured. The per-user 3/15 and input/output limits preserve AI_CONFIG; aggregate caps add protection absent from the old client-only costMonitor.

## Purchases and restore

Allowed bundle/package: `com.cristianortega.flexbreak`. Allowed SKUs: `flexbreak_monthly_4.99`, `flexbreak_yearly_44.99`, `flexbreak_monthly_verified`, `flexbreak_yearly_verified`. Apple app ID: 6743581671. Credential bundle/store environment mismatches fail closed.

Apple requires the **original signed StoreKit 2 transaction JWS from the client**, not transactionId alone. The official App Store Server Library validates certificate chain, online certificate status, bundle, environment and app ID, then authenticates Get All Subscription Statuses and validates the returned transaction/renewal JWS. Paid access requires active store status, matching SKU, future store expiry and no revocation. No expiry is synthesized from a purchase date. Missing keys or upstream failures never manufacture premium or silently overwrite a known entitlement.

Google authenticates a scoped service account to `purchases.subscriptionsv2.get` for the configured package, matching SKU and actual expiry/state. Google grace retains access through its verified extended expiry. Apple status 4 uses the signature-verified renewal gracePeriodExpiresDate; missing grace dates fail closed. Apple current status may select another allowlisted SKU in the same original transaction while the submitted proof must still match its original SKU. Canceled-but-unexpired subscriptions retain their already-paid period; expired/on-hold/revoked entitlement states do not grant access. Tests are denied unless explicitly enabled. Verified `linkedPurchaseToken` creates canonical aliases for normal upgrades/replacements; old stored token proofs refresh the current canonical proof live instead of overwriting a new plan with an old cancellation.

A verified store proof is bearer evidence. A valid restore can link another anonymous Firebase UID to the same canonical store entitlement without evicting another device or requiring an account. Apple identity is originalTransactionId + environment; Google uses verified token aliases. Paid AI limits are keyed to this canonical entitlement, so multiple UIDs share one paid allowance. AI/speech premium checks reuse canonical store status for at most 15 minutes and never beyond verified expiry, then refresh live. Refund access can therefore persist up to 15 minutes unless an explicit purchase/Restore check updates the shared record sooner. Inactive results are cached for 15 minutes; records inactive for over three days require Restore to reactivate. Same-UID replay is idempotent. Stale slower checks cannot overwrite newer inactive state. A holder of a stolen valid purchase proof could restore it: this is the explicit accountless restore tradeoff approved for existing users. App attestation and optional account linking are future mitigations, not simulated guarantees.

Server-issued free codes are different: an atomic redemption can grant an exact duration from the privileged code document. Code transactions consume once globally, preserve transferable family/promo behavior, and return the exact original grant on same-UID retry after a lost response/local save failure. No format-based/offline fallback. Only `emailBindingPolicy:"verified_email"` requires a matching verified Firebase email; the legacy email field alone does not bind a transferable code. Unknown policies/types/durations fail closed.

## Server configuration and least privilege

Configure Supabase function secrets through the owner's authenticated admin channel; never add values to git or app env. Required by used endpoints:

- `FIREBASE_SERVICE_ACCOUNT_JSON` **or** `FIREBASE_SERVICE_ACCOUNT_BASE64`: service account for `flexbreak-28ad0`, permitted Firestore read/write for these server operations. The implementation checks project_id and uses firebase-admin REST. Use a dedicated account, not owner/editor credentials; Firestore IAM currently scopes at database rather than collection, so restrictive client rules are still essential.
- `OPENROUTER_API_KEY` and/or `GROQ_API_KEY`: one available provider required; two preserve fallback. Set provider-side billing/usage caps separately. Old exposed credentials must be rotated by the owner.
- `OPENWEATHER_API_KEY`: server-only OpenWeather key; fixed HTTPS current/forecast paths, imperial units, finite bounded latitude/longitude, 10-second upstream timeout, shared project/provider budgets and 24 requests/UID/day. No coordinates are logged.
- `GOOGLE_SPEECH_API_KEY`: Speech-to-Text API enabled with service/API restrictions.
- `ZEROBOUNCE_API_KEY`: valid/catch-all business qualification; missing/outage returns 503.
- `APPLE_PRIVATE_KEY_P8`, `APPLE_KEY_ID`, `APPLE_ISSUER_ID`, `APPLE_APP_ID=6743581671`: App Store Server API key for the actual app/team. `APPLE_ALLOW_SANDBOX=true` only for explicitly approved TestFlight/sandbox operation; production-only is default. Sandbox identity remains separate from production.
- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` or `GOOGLE_PLAY_SERVICE_ACCOUNT_BASE64`: account with Play purchase/subscription access; OAuth scope is only androidpublisher. `GOOGLE_ALLOW_TEST_PURCHASES=true` only for approved test deployment.
- Optional bounded caps: `PROJECT_DAILY_REQUEST_LIMIT` (default500,max2000), `PROJECT_MONTHLY_REQUEST_LIMIT` (default5000,max20000).
- `LEGACY_PROXY_ENABLED=true` only during the compatibility phase below.

Deny **all client reads/writes** to: backendUsers, backendUsage, backendBudgets, backendVerifications, backendEmailClaims, backendGrants, backendStoreEntitlements, backendStoreAliases, backendEntitlements. These collections include identity links, verification email and receipt proofs. Privileged server accesses use IAM. No public list/read endpoints exist. OneTimeCodes writes must be privileged only; code creation/admin issuance is intentionally not provided to clients. Existing legacy verification/grant migration needs an explicit owner-approved mapping; untrusted device premium flags are never imported as server grants.

## Phase-0 legacy compatibility and rollout

Separate entrypoints `ai-chat-firebase`, `ai-chat`, `transcribe-audio`, `verify-email` retain original response shapes and field names for installed clients. They are **unauthenticated** because those clients have no Firebase token. They share all aggregate project/provider budgets and concurrency with v2, enforce bounded input and fail-closed secrets, and never grant canonical paid entitlement. Default disabled until LEGACY_PROXY_ENABLED is explicitly set. UserId is untrusted and ignored. This reduces financial exposure; it does not authenticate old clients or eliminate quota-exhaustion attacks. Keep deployment code separate from v2 until owner review.

Legacy WebM Opus accepts actual bounded EBML/WebM/Opus data at 48kHz (200KB), plus validated WAV/AMR. The synchronous Google API imposes its own short-audio duration ceiling for WebM; unlike new WAV/AMR, arbitrary WebM duration is not parsed locally. Prior native clients actually produced AAC .m4a and CAF while labeling them WebM/LINEAR16; those mislabeled containers are rejected explicitly. Their payload/response contract is retained; a server transcoder was not invented to mask that original defect. The new recorder fixes the actual media format.

1. Initialize Firebase Authentication for flexbreak-28ad0 and enable Anonymous sign-in before any v2 client rollout. The owner console currently shows Get Started, so this is an operational prerequisite, not a completed check. Review source/rules, provision scoped server/store/provider credentials, and configure budgets. Confirm named root certificates/fingerprints below and real bundle/SKUs/store team. Do not deploy with missing credentials and call it ready.
2. Run local checks plus Firestore-emulator contention, signed sandbox purchase/renewal/refund/restore fixtures, current provider and WAV/AMR device smoke tests in a staging deployment. Accountless multi-device restore must demonstrate shared paid quota and live refund handling.
3. If legacy mitigation is approved, deploy only the reviewed compatibility handlers with aggregate limits and enable flag; retain the recovered source for rollback. Monitor generic status/count metrics, never raw tokens/audio/email/proofs.
4. Deploy v2 with Firebase JWT verification in handlers and server-only Firestore rules; release matching Firebase-authenticated client/model list/timezone/recorder/IAP changes. No backend/client cutover was performed by this work.
5. Once adoption is measured and the minimum supported version is raised, disable/remove legacy endpoints and the flag. Disabling legacy before the client upgrade intentionally stops those older proxy features.

## Primary references and trust anchors

- Firebase JWT checks and Google X509 endpoint: https://firebase.google.com/docs/auth/admin/verify-id-tokens
- Official Apple library/verification: https://github.com/apple/app-store-server-library-node and https://apple.github.io/app-store-server-library-node/classes/SignedDataVerifier.html
- Apple subscription status: https://developer.apple.com/documentation/appstoreserverapi/get-all-subscription-statuses
- Apple root certificates, downloaded from this official page on 2026-09-10: https://www.apple.com/certificateauthority/ . DER originals in functions/_shared/certificates; identical base64 bytes embedded in apple-roots.ts so deployment does not depend on unconfigured static-file bundling. G3 SHA256: 63343ABFB89A6A03EBB57E9B3F5FA7BE7C4F5C756F3017B3A8C488C3653E9179.
- Google subscriptionsv2.get: https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptionsv2/get
- Groq supported/deprecated models: https://console.groq.com/docs/models and https://console.groq.com/docs/deprecations . Llama 3.1 8B developer/free tier was retired August16,2026; gpt-oss-20b is its documented replacement.
- OpenRouter current Llama8B endpoint: https://openrouter.ai/meta-llama/llama-3.1-8b-instruct/api

### Post-grade source corrections (validation pending)

Per-UID request reservation now precedes the shared project charge. Legacy callers have a separate transactional limit of 50 requests/day and 500/month (`LEGACY_DAILY_REQUEST_LIMIT`, ceiling 100; `LEGACY_MONTHLY_REQUEST_LIMIT`, ceiling 1000), charged before shared budgets. This reduces legacy and single-UID denial of service; anonymous UID creation can still exhaust the project cap. App attestation/App Check with matching client support remains a required availability follow-up before broad public exposure; it is not enabled or claimed here.

Google certificate outages return 503; an unknown signing key triggers a cache refresh, bounded to once per minute per isolate. JWT checks allow 60 seconds of clock skew. Code `expiresAtTimestamp` (Firestore Timestamp) takes precedence over legacy ISO `expiresAt`, even when expired. ZeroBounce is charged only after local-domain rejection and secret checks, immediately before the paid request. Client response envelopes are unchanged; purchase verification can return an upgraded allowlisted SKU while echoing the submitted proof.

The separate backend package manifest overrides transitive uuid to 11.1.1. The replacement lock was resolved in the prior diagnosis with identical dependency roots; it preserves all current imports, including weather's existing helpers. Audit/check/test have **not** been rerun after these source corrections because the operator requested a quiet pause. Serial follow-up: `deno fmt --config supabase/deno.json supabase/functions supabase/tests`, `deno lint --config supabase/deno.json supabase/functions supabase/tests`, `deno task --config supabase/deno.json check`, `deno task --config supabase/deno.json test`, then from `supabase/`, `deno audit` (pinned Deno 2.9.6). Do not claim zero backend advisories until that audit succeeds.
