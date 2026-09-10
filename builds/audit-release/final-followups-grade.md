# Privacy, release and entitlement follow-up grade

Read-only Fable review completed before the user requested automatic merge-triggered deployment. Release automation changes require a new grade.

Grade complete. All five bars PASS at the code level. I found no blocking defect and two Low items, both narrow and neither a regression of the earlier passes. I ran no shell, so the test, lint, prebuild and audit counts stay as reported by the fix notes, not verified here.

## Defects, severity ordered

- **Low, privacy, pre-existing (not a follow-up regression).** The coach switch writes `@ai_wellness_enabled`, `@ai_wellness_toggle_count` and `@ai_wellness_last_toggle` outside the lifecycle at `src/components/settings/ai/AIWellnessToggle.tsx:83-84,90-91,119`. If a user flips the switch on while a deletion is draining, the enabled flag can land after the verification read at `src/services/ai/deleteAIData.ts:19` and survive, while the success alert says the coach was turned off. The follow-on `scheduleAIWellnessV2` is tracked and rejected, so nothing gets scheduled and the UI resets. Window is the deletion spinner on the same screen. Fix is to wrap `handleToggle` in `runAIUIWork`.
- **Low, entitlements, latent.** `cancelSubscription` maps to `reconcileStore(true)` and returns immediately when an automatic reconcile is in flight (`src/context/PremiumContext.tsx:80`). The explicit call then resolves before the store answer exists. No caller today (grep found only the definition and the provider value), and the in-flight automatic run performs the same restore, so the store outcome is equivalent.

## Per-bar grades

**1. Privacy follow-ups: PASS, no regression of the core lifecycle.**

| Criterion | Result | Evidence |
|---|---|---|
| Deletion reachable with coach disabled | PASS | `DataManagement.tsx:24-46` renders `AIDataManagement` on expand with no enabled gate; test `privacy-settings.test.mjs:26-32`. |
| Toggle invalidation | PASS | `AIWellnessSettings.tsx:17-24` subscribes `onAIDataDeleted` and gates the initial async read by generation; test `:34-41`. Success alert states the coach was turned off, `AIDataManagement.tsx:95`. |
| Late preparation URI cleanup | PASS | `voiceRecordingService.ts:79-89` uses the local recorder, releases it and deletes its URI even when the pre-drain cancel already cleared the shared field. Test now starts with a null URI, `privacy-lifecycle.test.mjs:133-135`. |
| Optional notification data | PASS | `deleteAIData.ts:8-10` guards null/undefined; test notices include `undefined` and `null`, `privacy-lifecycle.test.mjs:17,21-22`. |
| Honest retained metadata | PASS | Inventory `localAIData.ts:5-9` matches the real key shape `@rate_limit_<type>_<id>` at `reliabilityService.ts:160` with types at `:28-38`. Retention of `@error_metrics` disclosed in confirm, success and export text, `AIDataManagement.tsx:82,95`, `localAIData.ts:19`; test `:179-188`. |
| Cancellation guards, no stale writes | PASS | `runAIUIWork` rethrows anything that is not `AIDataDeletionError`, `aiDataLifecycle.ts:4-8`; test `:190-197`. Onboarding, upgrade and notification handlers guard every post-await continuation (`AIWellnessOnboarding.tsx:71,100,109`, `AIWellnessPremiumUpgrade.tsx:71,100,109,114`, `aiNotificationHandler.ts:75,90,138,167,182`). Nested `runAIUIWork` inside onboarding is safe because the inner boundary swallows only cancellation. |
| Core lifecycle unchanged | PASS | Register-before-work, invalidate, drain, remove order intact at `aiDataLifecycle.ts:24-45`. `getMemory` returns a default without persisting (`memoryService.ts:106-126`), so opening Data Management after deletion recreates nothing. |

**2. Backend deployment: PASS.**

| Criterion | Result | Evidence |
|---|---|---|
| Fixed project, explicit named selection | PASS | Project constant and two frozen lists, `scripts/deploy-backend.mjs:6-11`; args per function at `:35`; selection validated with `Object.hasOwn` at `:18`. Test `backend-deploy.test.mjs:9-15`. |
| Immutable main SHA | PASS | Workflow requires `refs/heads/main` and checks out `github.sha` (`deploy-backend.yml:20-23,33-36`); script rechecks ref and compares `git rev-parse HEAD` to `GITHUB_SHA` (`:14-17,54`). |
| Complete CI before production environment | PASS | `quality` reuses `ci.yml` (all three jobs) and `deploy` needs it before `environment: production` (`deploy-backend.yml:24-29`). |
| No PR secret inheritance | PASS | `ci.yml` references no secrets; the reusable call passes none; the token is only in the deploy step env (`deploy-backend.yml:44-46`). |
| Serialized deployment and store | PASS | Same group `flexbreak-production-release`, `cancel-in-progress: false`, in both `deploy-backend.yml:13-15` and `release.yml:18-20`. |
| No implicit all-function deletion or secret/flag changes | PASS | One named `functions deploy` per function; manifest must contain exactly the ten known functions with `verify_jwt = false`, any other entry rejected (`:20-34`); test `:24-28`. |
| Fail-stop, truthful partial reporting | PASS | Sequential, throws on first failure, summary only for completed commands and states runtime health unverified (`:38-43,48,60`); test `:30-36`. |

Live credentials, `--use-api` bundling with `deno.json` as import map, and CLI behavior remain documented as unverified in `docs/BACKEND_DEPLOYMENT.md:16,22`. That is correct labeling.

**3. CNG and signing: PASS, with honest limits.**

| Criterion | Result | Evidence |
|---|---|---|
| Stale native trees removed, generated projects own native | PASS | `/ios/` and `/android/` ignored (`.gitignore:66-67`), excluded from EAS (`.easignore:21-22`), tracked Android files deleted per git status. |
| No native Firebase consumer relies on removed files | PASS | Search outside node_modules, data and docs finds no `googleServicesFile`, google-services, GoogleService-Info, React Native Firebase, or push-token calls. JS identity stays `flexbreak-28ad0` in `firebase.config.js:4-6`. |
| Guard sees final EAS-injected signing before packaging | PASS at source level | Runs in `taskGraph.whenReady`, only for release variants with a package/assemble/bundle/sign task in the graph (`withReleaseSigningGuard.mjs:7-16`). Debug variants untouched. Ordering versus the EAS helper is documented, not executed (`NATIVE_MIGRATION.md:56`). |
| Rejects unsigned/debug including renamed template bytes | PASS | `check-android-signing.mjs:8-18` rejects missing/not-ready config, debug name/alias/file, empty keystore, and the public keystore SHA-256 under any name. Tests `native-signing.test.mjs:9-19`. |
| Survives prebuild and upload | PASS | Idempotent insert with tamper detection (`withReleaseSigningGuard.mjs:32-43`, tests `:21-34`); `.easignore` keeps `plugins/` and `scripts/` while dropping `tests/` and `*.keystore` (`:84,259`). |

No Gradle or native compilation is proven, as the doc states. One inconsistency, not a defect: app.json declares `NSUserActivityTypes: ["OpenFlexCoachIntent"]` (`app.json:20-22`) while the Siri plugin sets `com.cristianortega.flexbreak.openFlexCoach` plus `INIntentsSupported` (`withSiriShortcuts.mjs:6-11`). Both are inert metadata with no intent implementation, consistent with the doc's "unverified/unsupported" claim.

**4. Coach deep-link: PASS.** `canAccessFlexCoach` performs no writes (`siriShortcuts.ts:6-48`); the only writer of the first-use key is `checkAccessAndLimits` at `aiWellnessService.ts:704-706`, reached from `processWellnessCheckIn` (`:267,278`), which the chat calls only on send (`FlexChatModal.tsx:463`). The deep link merely opens the modal (`App.tsx:543-547`). Disabled and used-free-off-Wednesday remain gated (`siriShortcuts.ts:10,33`). Test asserts no `setItem` and both gates on a Thursday fixture (`coach-deeplink.test.mjs:5-25`).

**5. Reconcile cooldown: PASS.**

| Criterion | Result | Evidence |
|---|---|---|
| 15 min after success, 60 s after failure | PASS | `PremiumContext.tsx:12-13,91-96`; tests `entitlements-context.test.mjs:135-145,155-162`. |
| Concurrent reconciliation deduped | PASS | `reconciling` ref at `:80-81,116`. |
| Explicit restore bypasses cooldown | PASS | `explicit` skips the timing check (`:83`); modal restore calls `restorePurchases` directly (`SubscriptionModal.tsx:231,282`); restart test `:147-153`. |
| Local expiry/status refresh immediate on every foreground | PASS | `:133-137`; test `:140-142`. |
| Stored hint not entitlement authority | PASS | `@flexbreak:store_reconcile` only feeds timing (`:84-96`); entitlement still derives from `getEntitlementSnapshot` (`storageService.ts:210-224`). |
| Errors never revoke or block init | PASS | Clear only on `success && !hasPurchases` (`:102-107`); any throw is caught (`:113-114`); init flag set before reconcile starts (`:128-132`). |
| Clock rollback | PASS | Negative elapsed proceeds (`:95`). Persisted `attemptedAt` validated finite (`:88`). |
| Async init/persistence races | PASS | In-memory ref set before the AsyncStorage write (`:109-110`); a kill before persistence only causes one extra reconcile next launch. Entitlement writes are serialized (`storageService.ts:174-179`). |

The `success`/`hasPurchases` semantics are consistent: store connection failure or a verification error yields `success:false` (`iapService.ts:206,215,218`), while a connected store with no active known purchase yields the definitive `success:true, hasPurchases:false` (`:216`).

## Remaining unknowns, all release gates rather than code defects

- iOS `getAvailablePurchases` returning empty while signed out of the App Store would still clear paid entitlement, now at most once per 15 minutes. Carried over from the prior grade, device-only.
- Gradle execution of the guard, EAS helper ordering, and actual signed binaries.
- Live Supabase deploy with the pinned CLI, `--use-api`, and `deno.json` as import map.
- Device behavior for recorder stop during preparation and notification `data` shapes.
