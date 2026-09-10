# Independent backend grade — initial pass

Reviewer: claude-fable-5-1; successful response, read-only. This is the initial grade; subsequent fixes and final verification are recorded separately.

**Overall: not release-ready as-is.** Authentication, input bounding, quota atomicity, one-time codes, and error hygiene are solid. Two reachable correctness defects in the purchase and premium path would hit paying users at tiny scale, and one Apple plan-change case turns premium AI into hard errors. Nothing here leaks credentials or lets a client mint premium.

## Grades

| Criterion | Grade | Evidence |
|---|---|---|
| Firebase JWT signature, issuer, audience, time | PASS | `auth.ts:57-71`. RS256 only, kid required, issuer and audience pinned, exp via jose, iat and auth_time not in future, sub bounded with no slash. Tests sign with real RSA keys. |
| Caller identity | PASS | Handler uses only `identity.uid`; spoofed `userId` proven ignored in `handlers.test.ts:12-43`. |
| No client premium trust | PASS | `premium`, `isActive`, `expiryDate` from the body never read. Client trusts server echo only, `iapService.ts:49-59`. |
| Strict bounded provider input and responses | PASS | Measured streams, allowlisted models, token cap 300, WAV and AMR frame parsing, 1 MiB upstream cap. |
| Durable atomic per-identity quota | PASS at code level | `quota.ts:20-49` reserve and release are single transactions. Contention on real Firestore is UNVERIFIED. The test adapter is serialized. |
| Aggregate budgets across UID recreation and concurrency | PASS for cost bounding | `spend` keyed by provider and UTC day, not UID. See finding 2 for the availability consequence. |
| Race-safe one-time codes | PASS | `redemption.ts:22-104` single transaction, idempotent same-UID retry. Legacy codes store ISO `expiresAt`, so the string parse works. |
| Apple and Google: revoked, expired, restore, multi-device | PASS at code level | `purchases.ts:116, 281-284, 358`. Live store behavior UNVERIFIED. |
| Apple and Google: grace period | FAIL | Both stores say to keep access during grace. Server denies. Finding 4. |
| Upgrades | FAIL for Apple, PASS for Google | Finding 3. |
| Versioned gateway JWT config | PASS | `config.toml` sets verify_jwt false on all nine; each v2 handler verifies itself. |
| Legacy compatibility, shape preserved, globals limit billing | PASS | `legacy.ts` keeps old envelopes and shares budgets. See finding 6. |
| No credential or PII in errors | PASS | Only codes serialized, `handler.ts:132`. Minor: `MISSING_<ENV>` names which secret is absent, `http.ts:73`. |

## Code defects, by severity

**1. HIGH. Premium AI burns the shared store-verification budget on every request.** `premiumState` at `purchases.ts:418-423` spends one apple or googleplay unit and calls the store live for every chat and speech request, before the chat quota is even reserved at `handler.ts:63-72`. That budget is the same 500 per UTC day used by verify-purchase-v2. Roughly 34 premium iOS users each using their 15 daily chats exhausts it. After that every purchase verification, restore, and premium AI call returns 429 PROJECT_BUDGET_LIMIT until midnight UTC. No attacker needed. Repro: seed one canonical entitlement, link one UID, call ai-chat-v2 501 times across a day; verify-purchase-v2 then fails for everyone. Minimal fix: in `premiumState`, return the stored record when `saved.checkedAt` is newer than a TTL such as six hours and `saved.expiryDate` is still in the future; go live only when stale, when expiry has passed, or when the stored record is inactive but recently so. Also skip the live call entirely when the stored record has been inactive for more than a few days.

**2. HIGH availability, accepted design. Any anonymous token holder can take the backend offline for the day.** `handler.ts:53` charges the project budget before the per-UID reserve at line 57, and `handler.ts:118` charges the apple or googleplay budget before the proof is validated. Anonymous sign-in is free, so 500 requests with garbage proofs from one device exhaust the day. The README acknowledges this class of attack. I am not grading it FAIL because it is the stated cost-over-availability choice, but it must be an explicit go or no-go decision with App Check named as the prerequisite for public exposure. Reordering the reserve ahead of the spend is a one-line hardening that only slows a single-UID attacker.

**3. MEDIUM. Apple plan change turns premium AI into hard 422 errors.** An upgrade or crossgrade in one subscription group keeps originalTransactionId but changes productId. The stored canonical proof carries the old productId. On the next premium request, `apple()` filters the status response by that productId at `purchases.ts:193-196` and `appleResult` rejects at line 104, so `premiumState` throws SUBSCRIPTION_NOT_FOUND and the chat request fails outright rather than degrading. The client never resubmits the new transaction on its own: `iapService.ts:105` drops purchase updates unless `updater` is set, which only happens inside purchase or restore flows. The user is stuck until they tap Restore. Minimal fix: in the status loop accept any productId in `PRODUCTS`, pass the decoded productId into the result, and keep the strict productId check only for the client-submitted proof at line 150. On the client, set a default `updater` at init so background transactions get verified.

**4. MEDIUM, policy. Grace period denied on both stores.** `purchases.ts:116` requires status 1, so Apple status 4 BILLING_GRACE_PERIOD is inactive. `purchases.ts:281-284` omits SUBSCRIPTION_STATE_IN_GRACE_PERIOD. Apple and Google both document that the user should keep access during grace. If this stays deliberate, disable grace period in App Store Connect and Play Console so the stores don't promise what the server refuses. Minimal fix: for Apple treat status 4 as active until `renewal.gracePeriodExpiresDate`; for Google add the grace state to the active list and rely on the extended expiryTime.

**5. LOW. Auth availability mapping.** A Google certificate fetch failure or timeout at `auth.ts:18-21` throws a TypeError, which the catch at line 77-80 maps to 401 INVALID_TOKEN instead of 503, so the client burns its one retry and shows a reconnect error. An unknown kid at line 36 never triggers a refresh, so a key rotation inside the cache window fails for up to an hour. Zero clock tolerance at lines 69-70. Fix: wrap the fetch in try and rethrow as the existing 503, refresh once on unknown kid, and pass `clockTolerance: 60` to jwtVerify.

**6. LOW. Legacy flag makes v2 availability depend on public traffic.** While LEGACY_PROXY_ENABLED is true, `legacy.ts:43-47` gives unauthenticated callers AI chat with no per-caller limit, drawing on the same project budget as v2. Enabling it should be paired with a lower `PROJECT_DAILY_REQUEST_LIMIT` for the legacy bucket or a separate cap.

**7. LOW. Two small mismatches.** `redemption.ts:32` reads only `expiresAt`, while the phase-0 rules at `firestore.phase0.rules:48` treat `expiresAtTimestamp` as authoritative. A code created with only the timestamp field returns 410 on v2. Accept either. `handler.ts:108` spends a zerobounce unit before `email.ts:44-52` rejects personal domains locally, wasting budget.

## External live validation, not code defects

- Apple: real sandbox JWS through `SignedDataVerifier` with OCSP, Get All Subscription Statuses auth, refund and renewal fixtures. UNVERIFIED.
- Google: service-account OAuth, subscriptionsv2.get, linkedPurchaseToken on a real upgrade. UNVERIFIED.
- Firestore transactions over REST: the SDK only forces gRPC for snapshot listeners, so transactions should work, but contention behavior on the hot `backendBudgets/project_day_*` document is UNVERIFIED.
- Client: expo-iap `purchase.id` must equal the Apple transactionId or `purchases.ts:152` rejects every iOS proof. On Android, if the library substitutes the purchase token for `id`, the 100-character cap at `purchases.ts:91` rejects it. Hermes must return a real IANA zone from `resolvedOptions().timeZone` or every request fails INVALID_TIME_ZONE. All three are cheap device checks.

Findings 1, 3, and 4 are each a few lines and should land before staging. Finding 2 is a decision for you, not a patch.
