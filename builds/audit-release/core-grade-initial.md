# Independent core grade — initial pass

Reviewer: claude-fable-5-1; successful response, read-only. This is the initial grade; subsequent fixes and final verification are recorded separately.

Grade complete. Evidence is from files read in this session only; no tests were run here (no shell), so the "52 passed" claim in entitlement-fixes.md is unverified by me.

## Verdict

| Bar | Result |
|---|---|
| 1. Completion retries cannot double-award; durable partial failure recoverable | PASS, with one Medium robustness finding (F1) |
| 2. FlexSave calendar/refill limits preserved | PASS |
| 3. Active paid = verified receipts only; expiry/refund honored; offline legacy-paid kept, promo never promoted | PASS, with one Medium contract gap (F2) |
| 4. Purchase persisted before finish; restore without fake expiry | PASS |
| 5. Atomic server code replay contract; dev grants unreachable in production | PASS for dev grants; discount-code contract is broken end-to-end by the modal (F3, preexisting) |

## Findings

**F1 (Medium, new) A permanently failing receipt blocks every later completion and the whole gamification load.** `src/utils/progress/gameEngine.ts:211-219` re-runs `finishCompletion` for every non-complete receipt before touching the new routine, and `src/hooks/progress/useGamification.ts:87` awaits recovery before anything else. Any throw inside recovery (strict read rejecting a legacy record at `storageService.ts:260`, or `updateUserChallenges(…, true)` rethrowing at `challengeManager.ts:1210`) now propagates. Repro: seed `@user_progress` with a `base` receipt and a challenge whose `category` is not daily/weekly/monthly/special; `getChallengeCountsByStatus` throws a TypeError, so every new `processCompletedRoutine` rejects before writing the new routine's pending receipt, the routine is dropped (RoutineScreen has no retry), and `loadGamificationData` aborts so level/XP state never populates. Old code swallowed that error. Minimal fix: in `processCompletedRoutine`, wrap each older-receipt recovery in try/catch and continue; in the hook, wrap `recoverPendingCompletions()` in its own try/catch so a stuck receipt cannot hide the summary.

**F2 (Medium, new) A malformed verify response is treated as a definitive "no subscription" and revokes paid access.** `src/services/iapService.ts:49-59` validates productId/platform/token/autoRenewing but not `isActive` or `expiryDate`. A response missing either falls into `isSubscriptionActive` → null → `'No active store subscription'`, which `restorePurchases` (`iapService.ts:205-208`) reports as `success:true, hasPurchases:false`, and `PremiumContext.tsx:78-80` then clears the paid record, including legacy-paid. Repro: backend returns `{productId, platform, purchaseToken, autoRenewing:true}` only. Minimal fix: in `verifyPurchase`, throw when `typeof verified.isActive !== 'boolean'` or `!Number.isFinite(Date.parse(verified.expiryDate))`; return null only for a well-formed inactive/expired answer.

**F3 (Medium, preexisting in trunk) Discount codes never produce discounted SKUs.** `oneTimeCodeService.ts:45` correctly stores `user_type` = office/student, then `SubscriptionModal.tsx:353-354` overwrites it with `'discounted'`, which `getProductsForUser` (`iapService.ts:157`) maps to regular products. `verificationStatus`/`userType` state is also never updated after redemption (lines 356-360 commented out). Fix: delete the three `setItem` calls and call `setVerificationStatus('verified'); setUserType(result.discountType)`.

**F4 (Low, preexisting) Stale `busy` closure in `SubscriptionModal.tsx:255`.** The 10s fallback reads render-time `busy` (false), so a failed purchase never resets the spinner or removes the AppState listener.

**F5 (Low, preexisting) bestStreak lost update.** `gameEngine.ts:181-182` collaborators write bestStreak to storage, then `persistCompletion` at line 195 overwrites with the stale in-memory value. Trunk had the same shape.

Checked and clean: receipt phase transitions and ambiguous-write handling, per-key idempotent history repair, frozen XP/welcome/boost in the receipt, deferred achievement emission, reward-manager intermediate save carrying `phase=base`, serialized queues in both engine and entitlement store, `saveSubscriptionDetails` validation, `finishTransaction` only after `update` resolves, `completed`/`processing` dedupe, `__DEV__` gating on every grant path (`saveIsPremium`, dev flag in migration, `clearAllPremiumStatus`, `clearSubscriptionDetails`, Settings handler, test utils). The production `TestingAccessForm` still writes the testing flag, but `readEntitlement` ignores it outside dev. Flex-save allowance is derived from applied dates in both refill paths and init no longer tops up an exhausted month.

## Contract notes and unverified items

- `verify-purchase-v2` must echo `productId`, `platform`, `purchaseToken` exactly and return boolean `autoRenewing`, boolean `isActive`, ISO `expiryDate`, optional `purchaseDate`. Request adds `transactionId` and `timeZone`.
- `redeem-code-v2` must return `expiryDate` strictly in the future for `free_premium`, or the client rejects a code the server already consumed; same-UID retry must return the same grant. Any non-2xx surfaces to the user as "service unavailable", including "invalid code".
- UNVERIFIED: iOS `getAvailablePurchases` returning an empty list while signed out of the App Store would clear paid access until the next successful reconcile. Device check needed.
- UNVERIFIED: a completion whose very first pending write fails cleanly is not durable and the app has no retry; the tests cover this only via an explicit second call.
