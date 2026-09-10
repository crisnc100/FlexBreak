# Final core and backend cross-family grade

Read-only Fable review. Deterministic backend checks: 42 tests, type check, lint and dependency audit passed. Native and live service qualification are separate.

Re-grade complete. Evidence is from files read this session only. I ran no shell, so the "42 backend / 53 client / tsc / audit 0" claims stay as reported by the fix notes, not verified here.

## Verdict: all prior findings resolved, no regressions found, two new capacity notes

**Core F1–F5**

| Finding | Result | Evidence |
|---|---|---|
| F1 failing older receipt blocks later completions and load | PASS | `src/utils/progress/gameEngine.ts:216-225` wraps each older-receipt recovery in try/catch and still finishes the new routine. `src/hooks/progress/useGamification.ts:87-88` isolates recovery from the summary load. Covered by `tests/behavior-completion.test.mjs:178-193`. |
| F2 malformed verify response revokes paid | PASS | `src/services/iapService.ts:53-59` throws unless `isActive` is boolean, `expiryDate` parses, and optional `purchaseDate` parses. Throw becomes `success:false` at line 88, which `restorePurchases` reports as a verification error at 213-215, so `PremiumContext.tsx:78-80` never clears. Test `tests/native-billing.test.mjs:85-92`. |
| F3 discount codes never produce discounted SKUs | PASS | The modal no longer writes `user_type`; it sets state from the server's discount type at `src/components/SubscriptionModal.tsx:359-360`, and the product effect re-runs on `userType` at line 123. Service writes office/student at `oneTimeCodeService.ts:43-45`. |
| F4 stale `busy` closure | PASS | Fallback timer reads attempt-local `purchaseSettled` and calls `cleanupPurchase`, `SubscriptionModal.tsx:210-215, 263-268`. |
| F5 bestStreak lost update | PASS | `gameEngine.ts:183-184` merges the collaborator's stored value before the final persist. Test `behavior-completion.test.mjs:195-199`. |

**Backend findings**

| Finding | Result | Evidence |
|---|---|---|
| 1 premium AI burns store budget | PASS | `purchases.ts:433-441`: 15-minute reuse only while `expiryDate` is still future (or record inactive); expired-but-marked-active goes live. Inactive over 3 days short-circuits at 443-445. Refund latency documented `supabase/README.md:53`. Test `purchases.test.ts:275-307`. |
| 3 Apple plan change hard-fails | PASS | Status loop accepts any allowlisted SKU, `purchases.ts:201-204`, picks latest expiry 226-230; `proofProductId` preserved at 121 and re-used for live re-verification at 448, so the stored JWS still binds to its original SKU at 158. Client default updater `iapService.ts:31-35, 104, 113-117`. Tests `purchases.test.ts:227-261`, `native-billing.test.mjs:94-110`. |
| 4 grace denied | PASS | Apple status 4 uses signed `gracePeriodExpiresDate`, `purchases.ts:111-113, 123-124`; Google grace state at 294. Missing grace date fails closed (117). |
| 5 auth availability | PASS | 503 on certificate outage `auth.ts:41, 101`; unknown kid refresh once per 60 s at 53; `clockTolerance: 60` at 86. Tests `auth.test.ts:91-127`. |
| 6 legacy drains v2 | PASS | Separate `legacy` bucket charged first, `legacy.ts:43`, caps 50/500 at `quota.ts:86-90`. Test `handlers.test.ts:222-232`. |
| 7 timestamp expiry, zerobounce ordering | PASS | `redemption.ts:12-21`; `email.ts:48-58` rejects locally and checks the secret before `beforeBillable`. Tests `quota-redemption.test.ts:152-174`, `handlers.test.ts:208-221`. |
| 2 anonymous budget exhaustion (accepted) | Documented | Per-UID reserve now precedes project spend, `handler.ts:56-58`; tradeoff and App Check prerequisite stated `README.md:97`. |

**Weather-v2.** Fixed HTTPS paths and server key at `weather.ts:20-28`; `kind` is a two-value enum and coordinates are finite and bounded (7-14); forecast list capped at 40 (32); 10 s timeout and 1 MiB body via `fetchJSON`. Handler reserves 24/UID/day and charges the provider budget, `handler.ts:121-124`. Client parsing is unchanged and reads the raw OpenWeather payload from `data`, `weatherService.ts:63-74, 227-232`. No weather key is imported from `@env` anywhere under `src`; only `APP_URL` is. Firestore rules deny all client access, `firestore.rules:6-8`. Atomic quota/code paths unchanged and single-transaction, `quota.ts:20-49, 95-103`, `redemption.ts:32-114`.

**Inactive background events and stale proofs.** A background inactive or pending event never touches local entitlement: `iapService.ts:113` drops non-purchased states and `verifyPurchase` returns null for inactive, so nothing is persisted or finished (77). A stale older-checked result cannot overwrite a newer inactive record, `purchases.ts:354-359`. Superseded Play tokens re-verify the current canonical proof, 400-408.

## New observations, not blockers

- **Medium, capacity.** Every foreground of a paid device runs `restorePurchases`, `PremiumContext.tsx:103-107`, which hits `verify-purchase-v2` and charges one project and one apple/googleplay unit, `handler.ts:58, 132`. With the 500/day default, about 50 paying users opening the app 10 times a day exhaust both budgets, independent of the finding-1 cache. Exhaustion is safe (429 is a verification error, not a revocation), but it will cut off purchases and premium AI for the rest of the UTC day. Consider gating reconcile by a local timestamp.
- **Low.** Apple status 4 with no `gracePeriodExpiresDate` throws inside the candidate loop, `purchases.ts:111-117`, aborting the whole status evaluation rather than skipping that candidate.

## Still UNVERIFIED (device/store)

expo-iap `purchase.id` equals the Apple transactionId (`purchases.ts:160`); Android `purchase.id` fits the 100-character cap (92); iOS `getAvailablePurchases` returning empty while signed out would clear paid; whether unfinished inactive transactions are redelivered each launch and re-spend the store budget; Firestore contention on the shared budget documents; live Apple/Google credentials.
