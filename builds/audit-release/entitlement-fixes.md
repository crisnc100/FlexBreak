# Client entitlement and redemption fixes

## Authority and live-user migration

`storageService.ts` now derives premium from a versioned local entitlement record (`@flexbreak:entitlements:v1`) with separate paid, legacy-paid, promo, and development sources. Reads and mutations are serialized; raw legacy fields are retained as provenance rather than repeatedly reinterpreted.

- Verified paid requires active=true, native IAP's server-verification marker, a valid future expiry, supported platform, product/token/purchase-date fields. Invalid updates throw. Inactive updates cannot revoke an unrelated active SKU. Disk failures propagate to PremiumContext so IAP will not finish an unpersisted purchase.
- Existing paid flags without promo provenance migrate to legacy-paid. Old synthesized purchase-date-plus-duration expiry is not trusted as server expiry; legacy-paid remains available during network failure until successful store reconciliation says no active purchases. Already server-verified old details remain paid, so their expiry still applies.
- Old valid free promos remain available until their cached expiry. Expired promo provenance prevents the old promo-set paid boolean from becoming perpetual legacy-paid. Paid revocation preserves an independent active promo.
- Production ignores development/generic boolean flags. saveIsPremium can grant/revoke only a development source under __DEV__. Production setPremiumStatus refreshes derived access. Diagnostic Settings handlers and test utility grants are development-only. No entitlement change deletes XP/history.

## Provider and UI behavior

`PremiumContext.tsx` loads local access first and runs store reconciliation in the background. Anonymous auth/network never blocks app initialization. It rechecks on foreground and at the next known expiry; network/store failure keeps cached legacy-paid access. A definitive successful no-purchases answer clears only paid access.

Actual runtime effective-access changes update AdService, premium/theme/subscription events, reward initialization, AI scheduling, and shared monthly FlexSave refresh. Startup does not replay the upgrade welcome. The old unconditional refill-to-two logic is gone; refresh uses flexSaveManager.refillMonthlyFlexSaves and preserves consumed monthly uses.

`SubscriptionModal.tsx` retains paid-unlock sounds, upgrade UI flags, feature/data/theme refreshes and subscription events, but verifies derived access and never sets a paid flag. Promo success refreshes the already cached promo grant. Native iapService (owned by the native lane) adds verificationSource='server' only after validating the backend result, matching platform/proof token, and checking the returned current SKU against the product allowlist. A verified Apple upgrade may return a different current SKU from the submitted proof SKU.

## Backend-only code redemption

`oneTimeCodeService.ts` now calls callBackend('redeem-code-v2', {code,email}) only. Client administrator code creation/listing, direct Firestore writes, format-only grants, permission-denied fallback grants, and local used-code authority are removed. Backend once-only bearer-code policy remains transferable; same UID/code retry returns the same original grant/expiry and repairs a failed local cache write without extending the grant.

Free promo persistence uses the server expiry and never writes @user_premium. Discount grants preserve existing verification status/type/email/method/date cache needed by product selection. No response or malformed/expired grant cannot create premium access.

## Verification

- Historical first entitlement pass: `node --test tests/entitlements*.test.mjs tests/behavior*.test.mjs tests/core*.test.mjs`: **52 passed**, zero failed/skipped. Current validation is recorded below.
- New actual-source storage/redemption tests cover legacy migration, synthetic expiry, promo expiry isolation, verified paid expiry, production developer bypass rejection, malformed subscriptions, failed persistence, matching inactive SKU, backend-unavailable family/formatted codes, server-expiry retry, and discount cache.
- New actual PremiumProvider tests use deterministic hook/native stubs and exercise startup/foreground network failure, definitive empty-store reconciliation, failed purchase callbacks, production boolean setters, transition side effects, shared monthly refresh and expiry-triggered downgrade.
- Owned ESLint: zero errors across PremiumContext, storageService, oneTimeCodeService, SubscriptionModal, SettingsScreen and AIWellnessTestUtils. Existing warning debt not suppressed.
- Current full `npm run type-check`: passes, zero diagnostics. The earlier parallel migration errors are resolved; no check was narrowed for this task.
- Reminder scheduling is now local-only and OS-repeating; the earlier authenticated-UID remote-write harness was superseded by the local scheduler regressions.

## Core Grade follow-up and current validation

Fable's core Grade findings F1–F5 were repaired. Entitlement-specific fixes: malformed verification booleans/dates fail reconciliation instead of revoking cached access (F2); office/student redemption updates modal selection without overwriting the service's verification cache (F3); the purchase fallback uses attempt-local settlement and listener/timer cleanup instead of a stale render-time busy flag (F4). IAP also persists background verified renewals through a default updater before UI callback installation. Completion isolation and best-streak fixes (F1/F5) are recorded in behavior-fixes.md.

Focused actual-source app tests after these fixes: **53/53 passed**, followed sequentially by a passing full typecheck. The seat subsequently verified the full app suite **128/128**, backend suite **42/42**, and Deno dependency audit **0 findings**. Final both-platform Hermes export passed in the single-worker lane; signed native compilation remains unverified.


## Limits / review focus

Store/device purchase and restoration remain native acceptance checks. Local client entitlement caches cannot protect against a modified client; privileged backend actions must independently authorize verified subscriptions/grants. Migration intentionally does not delete legacy records or revoke legacy-paid on uncertainty. A locally stored explicit server marker distinguishes current receipts from old synthesized-expiry records; the native verification path is its writer.

Legacy history/entitlement behavior is preserved without granting new indefinite access to promos. Receipt lifecycle and local privacy regressions are now implemented; see behavior-fixes.md and privacy-fixes.md. Physical-device acceptance remains outstanding.

## Automatic reconciliation capacity follow-up

The final core/backend review identified per-foreground verification spend. `PremiumContext.tsx` now limits successful automatic startup/foreground store reconciliation to once per 15 minutes. Failed verification retains cached access and permits another automatic attempt after 60 seconds. A dedicated local `@flexbreak:store_reconcile` timing record survives restarts; the client had no existing persisted verified `checkedAt` field to reuse. This record is only a scheduling hint and never grants access. Invalid/future timing values do not create an unbounded pause; persistence failure keeps the in-memory limit.

Every foreground still refreshes local effective access, expiry timers, ads and feature/UI state. Explicit cancellation reconciliation bypasses the cooldown. Explicit user restore continues calling the unthrottled IAP service; purchase callbacks are unchanged. Existing in-flight reconciliation deduplication remains.

Validation: actual-source context/modal/native-billing focused tests **20/20 passed**, then sequential full `npm run type-check` **exit 0**. Regressions cover repeated foreground events, local expiry during cooldown, persisted restart timing, explicit cancel/restore bypass and retry after failed verification. Only PremiumContext source and the context/native billing tests changed for this follow-up. No install, export, audit, commit or cloud action ran.
