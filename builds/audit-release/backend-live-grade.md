# Backend live evidence review — September 10, 2026

Read-only independent review. Envelope verified: `is_error: false`; model: `claude-fable-5-1`. Review predates this documentation follow-up.

Evidence gathered. Composing the verdict now.

**Verdict: PASS.** The limited claims are supported by the artifacts and the handler source. No evidence of touching existing user records, and no false claims of real purchase or provider success beyond OpenWeather. All readiness records remain blocked.

**Six additive v2 deployments: supported.**
- The bootstrap log records six sequential deploy commands, all exit code 0, between 15:36:43 and 15:37:47 UTC on 2026-09-10. Source SHA matches the merged PR #5 commit, and the bootstrap-source artifact records `serverSourceMatches: true` with CI quality jobs green.
- Inventory read-back lists exactly the six v2 slugs, all ACTIVE at version 1 with gateway JWT off. That matches the doc's claim that each handler verifies Firebase tokens itself, which `supabase/functions/_shared/auth.ts` does against issuer and audience `flexbreak-28ad0`.
- No rules publish or legacy deploy command appears anywhere in the logs. One gap: there is no post-deployment rules or legacy-function read-back, so "not changed" rests on the absence of commands, not on a second snapshot.

**44 passing checks: supported and arithmetically consistent.**
- 6 routes × 4 unauthenticated checks (24) + 6 × 2 malformed-body checks (12) + 6 own-user checks + 2 OpenWeather checks = 44. The raw probe output and the committed qualification JSON contain identical check arrays.
- Response codes match the source. Method denial, AUTH_REQUIRED and INVALID_TOKEN come from the handler and auth module. INVALID_JSON and INVALID_OBJECT come from the body parser, which runs after authentication but before any database access.
- The probe was run 55 seconds after the last deploy completed, so it exercised the newly deployed functions.

**Own-user cleanup: supported, and the count of three is exactly what the handler would have created.**
- The probe creates a fresh anonymous account via `accounts:signUp`, so the UID cannot collide with an existing user. It guards against slashes in the UID before building paths.
- For each of the 8 authenticated object-body requests, the handler writes `backendUsers/{uid}` and `backendUsage/requests_{uid}`. Only the two successful weather calls reach the weather reserve, writing `backendUsage/weather_{uid}`. The other four own-user checks throw in input validation before any route-specific reserve. That is three per-user docs, matching `dedicatedRecordsDeleted: 3`.
- Cleanup deletes only those UID-scoped paths plus the Auth account via the account's own ID token. Existing users are untouched.
- Shared writes that were left in place, as the doc states: the project day/month budget counters, the project concurrency lease doc, and the weather day/month budget counters. No Apple, ZeroBounce, chat or speech budget was consumed.

**No false provider or purchase claims.**
- Purchase: `purchaseInput` throws SIGNED_STOREKIT_PROOF_REQUIRED for a non-JWS token before the handler reaches the Apple budget spend or any Apple call. The doc correctly says only an unsigned proof was rejected.
- Email: `gmail.com` is in the local personal-domain list, so the handler returns "rejected" before the ZeroBounce call and before any `backendVerifications` or `backendEmailClaims` write. The probe additionally asserts `status === "rejected"`.
- Redeem: code `!` fails the regex before the transaction, so the legacy `oneTimeCodes` collection was not read.
- Chat and speech: `messages: []` and a missing audio field fail validation before any quota reserve or provider call.
- Weather: the deployed index files call the handler with no injected dependencies, so the 200 responses came from `api.openweathermap.org` using the server-side key. The probe validates response shape for both current and forecast. This is the only real provider exercised, as expected.

**Readiness remains blocked: verified.** `scripts/release-readiness.mjs` has all records at status `blocked` with null evidence: both native platforms, four service records, and both Apple and Google platform records.

**Legacy public rules remain: verified.** The pre-deployment rules snapshot shows `allow read, write: if true` on `fcm_tokens`, `user_reminders`, `verifiedEmails`, `oneTimeCodes` and `premiumUsers`, with default deny covering the new `backend*` collections.

**Corrections and caveats, none blocking:**
- The committed qualification JSON is a curated copy of the raw probe output. It drops the test UID and adds `sourceSha` and `limitations` that the probe script never writes. The raw output and the probe script live under `.artifacts/`, which is gitignored, so the committed evidence is derived and the primary artifact is not in version control. Worth one sentence in the activation note.
- unverified — whether the backend source at HEAD of this branch still matches the deployed SHA. The two later commits are titled as Firebase config and Apple-only policy changes, but I could not run git to confirm they left `supabase/functions` untouched.
- The doc's phrase "shared aggregate budgets left intact" also covers the project concurrency lease doc, which the cleanup did not name. Accurate in effect, slightly loose in wording.
