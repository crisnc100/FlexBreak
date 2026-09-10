# Staged Firestore rules rollout

These are reviewable candidates, not deployed rules. No live rule, code document, function, scheduler or client data was changed during this task.

The Firebase console for **flexbreak-28ad0** was inspected on September 10, 2026. Its rules published July 18, 2025 allow world read/write on five collections: `fcm_tokens`, `user_reminders`, `verifiedEmails`, `oneTimeCodes`, **and `premiumUsers`**. The prior repository policy omitted the last collection. [Policy transcription](../security-tests/firestore/live-policy-2026-09-10.rules) preserves the verified grants for comparison; it is not a byte-for-byte console export and must never be deployed.

## Candidates and ordering

| Stage | Config | Rules | Effect |
|---|---|---|---|
| Temporary bridge | `firebase.json` | `firestore.phase0.rules` | Denies enumeration/minting, bounds legacy reminder writes, restricts code consumption and code-backed discount records. |
| Final | `firebase.strict.json` | `firestore.rules` | Denies all Firestore client access; upgraded reminders are local and protected operations go through the authenticated backend. |
| Local tests only | `firebase.emulators.json` | Test suite loads both candidates | Loopback emulator and demo projects only. |

The missing `functions/` deployment source was removed from Firebase configuration. This neither deletes nor modifies existing deployed functions. Their retirement is a separate operator decision after source/log evidence and a rollout plan; never add a function deletion command to a rules deployment.

## Bridge preconditions and precise limitations

Before a bridge deployment, use an authorized administrative process to backfill **`expiresAtTimestamp`** on each valid existing `oneTimeCodes` document from its original ISO `expiresAt` value. Keep the exact original instant; do not extend expired codes, change ownership, recreate used codes or accept invalid dates. Validate counts and sample original/timestamp pairs. Rules cannot securely parse legacy ISO timestamps. A code without the trusted timestamp is intentionally non-redeemable through Firestore. Old clients tolerate the added field.

Review the actual existing token/reminder document shapes against the emulator fixtures before rollout. Existing extra fields are denied on subsequent client writes until migrated. New timestamps must use `serverTimestamp()`. Token length is bounded at 4096, reminder text at 500, day lists are unique known weekdays, time is HH:mm and timezone offset is bounded.

The bridge:

- Denies all collection listing, token/reminder reads and email/premium reads. A caller possessing a syntactically valid code can still read that individual code; rules cannot redact its metadata or rate-limit guessing.
- Denies creating/deleting codes. Consumption changes only `used`, `usedBy`, `usedAt`, `usedAtTimestamp`; it binds to the issued email, requires unexpired server timestamp, and permits only false→true once. Concurrent writes are serialized by Firestore, so a second consumption fails.
- Allows creation of an office-discount email record only after the matching issued code is consumed for that email, within ten minutes. It denies overwrites and free-premium records. Legacy free-premium expiry is client-calculated and cannot be made trustworthy by accepting those records. Old clients already catch this write failure and continue their local flow; their local grant is not server entitlement evidence.
- Accepts bounded unauthenticated legacy `device_*` token/reminder writes so old versions retain their existing notification path. **These IDs are not authentication. A guessed device ID can still be overwritten or spammed within the schema limits.** Authenticated callers can write only their own UID-addressed documents. This is a temporary reduction in exposure, not a secure long-term identity model.

Old binaries also contain an offline code-acceptance fallback; server rules cannot revoke arbitrary access granted entirely on a device. The upgraded app/backend removes that trust path. Do not claim the bridge fixes old binaries or server-proves a legacy local entitlement.

The `isPremium` and `premiumLevel` fields in bridge reminder records are bounded legacy scheduling hints, never receipt-verified entitlements. The authenticated backend must not trust them.

## Final policy and approval

The new client schedules local recurring reminders and does not register cloud tokens or reminder documents. Before applying final deny-all rules, verify adoption and actual new-client behavior, prove receipt/code/email operations use the new backend, review permission-denied telemetry and provide a migration/support path for remaining old versions. Final rules intentionally break legacy Firestore reminder writes and code redemption; do not apply them merely because tests pass.

The existing scheduled Firebase sender uses a different token transport from Expo tokens; replacing it without migrating document identity would risk duplicate reminders. Keep function/scheduler retirement separate. Root audit evidence and operator approval must determine whether and when to pause or remove each remote function.

After operator approval, deploy **only** the selected rules candidate to the explicit verified project. Prepared commands (not executed):

```sh
firebase deploy --project flexbreak-28ad0 --config firebase.json --only firestore:rules
# Later, after the final-policy adoption bar is satisfied:
firebase deploy --project flexbreak-28ad0 --config firebase.strict.json --only firestore:rules
```

Re-read the deployed rules immediately afterward and compare the selected source; verify a real allowed legacy case for the bridge and denied unauthorized cases. If rollback is necessary, use the previously reviewed restrictive candidate appropriate to installed-client adoption. Do not restore the archived world-access policy. Backfilled expiry timestamps are additive and need no rollback.

## Reproducible local verification

Use Node22 and Java21 (Temurin or another supported JRE); no production credentials are needed:

```sh
npm --prefix security-tests/firestore ci
npm exec --yes --package=node@22 --package=firebase-tools@15.30.0 -- \
  firebase emulators:exec --config firebase.emulators.json --only firestore \
  --project demo-flexbreak-rules 'npm --prefix security-tests/firestore test'
```

The suite refuses a missing/non-loopback emulator host, uses demo project IDs, resets only those emulator databases and tests collection enumeration, code minting, immutable fields, expiry, replay/concurrency, code-backed records, schema bounds, cross-UID tampering and final deny-all behavior. Rules-unit-testing5.0.2 and Firebase12.19.0 are pinned in a dedicated test lockfile; its audit is clean.

For this session, a task-local Temurin21 JRE was downloaded through the official Adoptium API into ignored `.artifacts/tools` and its SHA-256 was verified against the API metadata. It was used only for the local emulator. No Java installation or global environment setting was modified.
