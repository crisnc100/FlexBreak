# Cross-family reminder advisory

Model: claude-fable-5-1; is_error: false.

**Recommendation: kill the Firebase reminder sender and the four HTTP functions now, make local notifications the only reminder channel, and keep Firestore writes allowed for shipped clients until the new build dominates.** The remote path has never delivered and cannot be repaired without creating duplicates.

**Confirmed source facts**

- The deployed sender calls the FCM registration-token API on `token` from every `user_reminders` doc, with no Expo branch (`.artifacts/deployed/firebase/src/sendMotivationalMessages.ts:272-301`). The only Expo-aware code is `testPushNotification`, which `index.ts` does not export, so it is not deployed. No `expo-server-sdk` in the deployed package.json.
- Both shipped and branch clients store `ExponentPushToken[...]` from `getExpoPushTokenAsync` under the same AsyncStorage key. FCM rejects that format, and the sender's loop sits inside one try/catch, so the first bad token aborts that minute's run for every user. The 1439 daily invocations are the every-minute schedule doing nothing useful. unverified: only Cloud Logging can prove zero deliveries ever happened, and whether any doc holds a real FCM token.
- Shipped client (trunk on main) writes `user_reminders/device_<ts>_<rand>` only when enabling, never on disable, and never calls the `saveUserReminders` callable or any Firebase function (no `httpsCallable` in trunk src; AI, speech and email already hit Supabase). Nothing in either tree reads `user_reminders` or `fcm_tokens`. Only `sendWelcomeNotification` consumed `fcm_tokens`, and it is not deployed.
- Local reminders are one-shot time-interval triggers scheduled only from HomeScreen save actions. No startup reschedule exists. That is the actual "app must be reopened" limitation, and it is fixable locally.

**Risks that decide the plan**

- **Duplicate delivery if the sender is "fixed".** After upgrade an install owns two docs, the legacy device doc and the uid doc, both carrying the same Expo token, plus local schedules. A working Expo sender would fire three times per reminder. Nothing cleans the legacy doc. Rewriting the sender is therefore not an option.
- **Denying writes breaks shipped installs.** In the trunk service the actual `scheduleAdvancedReminders` call lives inside the Firestore try block. A rules denial skips it and posts a misleading "set locally" notice. Writes to `user_reminders` must stay open for shipped clients.
- **World-readable push tokens.** Rules allow read on both collections. Anyone can list every Expo token and post to the Expo push API directly. Deny read is compatible with every client today.
- **Ownership claim is moot once the sender dies.** Legacy `device_` docs are unowned and cannot be safely claimed. Do not build owner-match rules for data nobody consumes.
- **Public paid-provider endpoints.** `aiChat`, `transcribeAudio`, `verifyOfficeWorkerEmail` are unauthenticated callables with anonymous callers exempt from the rate limit, holding OpenRouter, Groq, Google Speech and ZeroBounce keys. No client references them.
- **Branch defect.** The new service returns false when disabling offline because it demands remote acknowledgement. With no consumer, that remote write is pure downside.

**Staged plan**

1. Operations now, no release needed. `firebase functions:delete` all six functions in us-central1 (the scheduler job goes with it). Deploy rules with `firebase deploy --only firestore:rules` (the repo has no `functions/` dir, so a bare deploy fails): `fcm_tokens` and `user_reminders` deny read, allow create and update; other collections per the phase-0 advisory. Rotate the four provider keys and update Supabase secrets, since they sat in publicly invokable functions.
2. Client changes for the release build. Remove the Firestore write and the push-token fetch from `reminderService.ts` and `fcmTokenService.ts`, and remove the "disable requires remote ack" false return. Switch `scheduleAdvancedReminders` to repeating `WEEKLY` triggers per selected day (present in the installed expo-notifications types), which delivers indefinitely with the app closed and removes the reopen limitation. Keep the cancel-by-type logic. Update `tests/behavior-reminders.test.mjs` to assert no remote write and weekly triggers.
3. Later, operator gated. Once the new build is dominant (count docs, not dates), deny all writes on both collections and delete them. Drop `SAVE_REMINDERS` from the Supabase config map; no `save-reminders` function exists.

**Operator-only unknowns**

- Cloud Logging for `sendPersonalReminders`: confirm the FCM invalid-token errors and zero successful sends.
- Doc counts and whether any token is not an Expo token.
- Whether deployed rules match the repo file.
- Whether the Expo project enforces push-security access tokens, which sets the severity of the readable-token window.

## Seat corrections and implementation

The branch App.tsx does refresh saved schedules on startup. Historical absence of successful deliveries is NOT established from source alone; Cloud Logging and actual token-format inventory remain required before retirement. No live functions were deleted or redeployed. New client uses repeating OS weekly reminders, preserves selected days and premium +2h reminder (including next-day rollover), and has no cloud write/token dependency. Strict disable still fails on OS cancellation failure. Partial scheduling rolls back installed reminders. The old remote-ack test was replaced because remote delivery is removed from the new client, not to hide a failing test. Six actual-source reminder regressions pass. Legacy rules remain necessary because old-client local scheduling depended on permissive cloud writes.
