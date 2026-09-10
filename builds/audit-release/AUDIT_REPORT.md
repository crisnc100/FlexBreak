# FlexBreak audit and remediation

## Current status

The audited local fixes and automatic production workflow passed deterministic checks and independent cross-family review. GitHub main protection and a main-only production environment are configured and verified; the existing App Store ID is recorded as its environment variable. The live application still uses the old rules and services. No app/backend deployment, native cloud build, store submission or public-policy publication occurred. Code repairs do not close live exposure until the staged rollout is applied.

## Findings and disposition

| Finding | Consequence | Remediation |
| --- | --- | --- |
| Live Firestore publicly reads/writes five sensitive collections | Token/email/code enumeration and tampering | Tested phase0 compatibility rules, followed by strict client deny policy after adoption; live publication pending |
| Provider functions accept unauthenticated/caller-claimed identity | Unbounded provider use and forged premium status | Versioned Firebase-JWT-authenticated Supabase functions, atomic quotas, project budgets, bounded inputs; compatibility functions have separate lower budgets |
| Client subscription status uses unreliable purchase history/guessed dates | Incorrect paid access and restore behavior | Store-verified expiry/status, separate paid/promo/dev sources, persistence before acknowledgment; prior blocking review findings resolved |
| Promo redemption can fall back to format-only acceptance and race | Free grants and repeated redemption | Server transaction with authoritative expiry, same-identity retry, no client minting or permission-denied grant fallback |
| AI deletion leaves sessions/history and races with pending replies | Deleted data can return | Shared lifecycle invalidation/draining, all-user local AI inventory, recorder and notification cleanup, full export and truthful copy |
| Duplicate completion and partial persistence are unsafe | Double/lost XP, streaks or challenges | Durable completion receipts, serialized processing, frozen awards and recovery regressions; prior blocking review findings resolved |
| FlexSave refill/calendar paths disagree | Incorrect allowance or refill | Calendar-consistent accounting and monthly limits covered by regressions |
| Live Firebase reminder scheduler remains after source deletion | Broken delivery and ongoing scheduled work | Recovered actual deployed source and confirmed invalid-FCM-token errors in live logs; new client uses repeating local notifications; old function retirement pending |
| Reminders are one-shot and premium day rollover is incorrect | Reminders stop or fire on wrong day | Weekly OS triggers, selected-day preservation, +2h rollover, offline disable, partial-failure cleanup |
| OpenWeather credential would be bundled in the mobile app | Extractable billable provider credential | Authenticated weather proxy; client carries no weather secret and preserves cached weather/forecast behavior |
| Old dependencies and native APIs | Known vulnerabilities and obsolete build chain | Expo57/ReactNative0.86/expo-iap/expo-audio/expo-video migration; guarded narrow dependency patches; native/device qualification still pending |
| Four overlapping workflows and placeholder checks | Misleading green CI and unreliable submissions | Real app/backend/emulator CI; merge-triggered production orchestration with cumulative recovery from partial deployments, immutable source validation, exact finished artifact, awaited submission, no automatic git writes |
| Conflicting App Store IDs and unresolved account configuration | Wrong target or failed submission | Existing public app ID6743581671 verified; exact Apple team and AdMob app IDs remain account checks; unused conflicting native Firebase files removed, JS project28ad0 retained |
| Public privacy policy promises no stored conversations, no transmission/sharing and unsupported fixed retention | Users receive inaccurate disclosure | Accurate release draft prepared; publication and store declarations required by readiness gate; Netlify owner access pending |
| Historical provider-key-looking value in public git log | Potential credential exposure | Historical location recorded without copying value; provider-side rotation/status verification pending |

Detailed baseline evidence: [security audit](security-audit.md), [behavior audit](behavior-audit.md), [live backend inventory](live-backend-inventory.md). Baseline documents preserve what was found; this report and fix reports describe the current implementation.

## Redundancy and tests

Removed proven unused client Firebase email writer, duplicate OpenRouter/Groq proxy wrappers, unused endpoint map, token registration and Firebase messaging wrapper, unreferenced native plugin, inactive OTA configuration, and duplicate CI orchestration. Replaced stale tracked SDK52 native trees with reproducible SDK57 generated projects; preserved the original trees in a local ignored archive and added a release signing guard against missing/debug credentials. Server-owned provider fallback now runs under a single request reservation; nested client retries no longer multiply billable calls. User-facing diagnostics that grant access are development-only. The weather CLI diagnostic now fails with a nonzero status for missing credentials/provider failure and does not recommend hardcoding keys.

No preexisting automated regression suite was deleted or weakened. The old test/lint scripts printed success; they now run actual checks. New tests load real app TypeScript modules with explicit native/network/storage mocks and cover failures, concurrency, replay and core invariants. Firestore rules are tested in the real emulator. Backend JWT tests use real RSA signatures; provider calls are mocked, so live store/credentials and physical-device behavior remain unverified. Reminder tests were updated to assert the replacement local-only delivery contract after recovered production evidence, while preserving cancellation/error assertions and adding repeating/day-rollover checks.

There are still ESLint warnings (primarily unused declarations, broad types and hook dependencies). Zero lint errors is not a claim that all maintenance debt or every possible bug is gone. Broad untested UI rewrites and speculative deletion were avoided to preserve specific features.

## Rollout and verification

Use [backend bootstrap and deployment](../../docs/BACKEND_DEPLOYMENT.md), [CI/store runbook](../../docs/CI_CD_SETUP_GUIDE.md), [backend contracts and rollout](../../supabase/README.md), [Firestore stages](../../docs/FIRESTORE_RULES_ROLLOUT.md), and [native migration](../../docs/NATIVE_MIGRATION.md). First deploy and verify backend services/auth/compatibility protections, qualify the native app on devices, then release the reviewed store binary. Tighten final rules and retire legacy services only after compatible adoption and verified dependency checks. Store upload is not public release. After one-time qualification, main merges run CI, deploy all six v2 functions when backend work is selected, then build/upload iOS and Android when mobile work is selected. Docs-only changes avoid remote work. Backend-only runs do not require mobile/privacy readiness; disclosure publication remains a separate required owner task and a mobile release gate.

Initial cross-family grades are recorded separately. The [core/backend re-grade](core-backend-grade-final.md) passed the prior blocking findings. The [follow-up grade](final-followups-grade.md) passed privacy, generated native projects, signing and entitlement reconciliation. The [automatic-deployment grade](automatic-deployment-grade.md) passed its five bars and final toggle follow-up. Root then reproduced and fixed the partial-deployment/revert recovery case. The [final re-grade](final-recovery-privacy-grade.md) passed that correction, remaining automation fixes and the public disclosure draft/gate with no blocking findings.

Serial verification: **128 app tests**, **42 backend tests**, TypeScript passes, app lint0errors/1153warnings, Deno lint/check pass, Deno audit no known vulnerabilities, and both platform Hermes bundles export successfully using one worker. Full app npm audit and dedicated rules-test dependency audit were both0; real Firestore emulator6tests passed. The changed/new nonignored text scan found no recognized provider/private-key/token patterns in273files; it is not an exhaustive secret-history guarantee. Fresh both-platform native prebuild passed with the signing guard and without obsolete native Firebase configuration. These results include the final automatic entitlement-reconciliation cooldown follow-up: successful automatic checks are spaced15minutes apart across restarts, failures back off60seconds, explicit restore bypasses the cooldown, and local expiry remains immediate. Its focused20-test run and full TypeScript check also passed.

Still unverified: signed native compilation/device behavior, production Firebase anonymous authentication and v2 runtime integration, real sandbox purchase/restore/refund/grace behavior, provider credentials, Apple team and production AdMob app IDs; publication of the owner-reviewed [privacy disclosure](../../docs/PRIVACY_POLICY_DRAFT.md) and corresponding store declarations. The protected store workflow intentionally remains blocked until these have reviewed evidence. No local test or reviewer pass is presented as production deployment evidence.

## Workspace

Path: `/Users/cortega/Documents/Projects/personal/FlexBreak/.worktrees/flexbreak-audit-release`  
Branch: `audit-release`  
Base: `origin/main @ 2adf4b6`  
Assigned local URL: `http://localhost:8081` (development server is not running).
