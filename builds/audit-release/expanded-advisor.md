Finished inspecting the code. Writing the advisory now.

**Verdict:** the plan's four expanded phases are the right work but the wrong order. Two items reduce live exposure today with zero client compatibility risk and should go first. Store submission is blocked by an SDK upgrade, and everything backend-facing has to ride on that release, so billing and auth cannot ship before the native migration lands.

## Sequence

**Stage A. Local fixes, no cloud dependency.** Ship-ready code, verified by the existing Node harness.

- Reminders. The scheduler at `src/services/notificationScheduler.ts:34-38` already cancels reminder types when disabled. The whole fix is moving that call out of the token-and-Firebase branch in the reminder service so it runs on every save. Delete the immediate "set locally" notification. Remote persistence of the disabled state is optional, see the dead-sender note below.
- Flex Save refill. The audit named one site. There are three, plus one legitimate one. Remove the zero-balance force refill at `src/utils/progress/modules/streakManager.ts:83-91`, the `|| currentFlexSaves === 0` clause at `flexSaveManager.ts:252`, and the unconditional top-up to 2 whenever premium is set at `src/context/PremiumContext.tsx:216-225`. Keep the current-month recount that precedes the force refill. Contract: refill only when the stored refill month differs from the current month, and stamp the month on every refill. Premium activation gets a refill only under that same rule.
- Date defects 4 and 5, storage failure 6, and the completion contract below.
- Redemption fallback. Retire the format-only local path at `src/services/oneTimeCodeService.ts:270-336` in production and return service-unavailable. Keep the family and test patterns behind a dev flag only. No backend needed for this.
- Entitlement model, part one. Introduce a premium source tag with values paid, promo, and dev, and compute access as paid-active or promo-unexpired. Stop the promo path from setting the paid flag at `src/components/SubscriptionModal.tsx:317`. Migration: an existing paid flag with no source is tagged paid-legacy and honored until a store answer says otherwise. Real expiry arrives in Stage C.
- SEC-05 and SEC-06 as the security audit scoped them. The retention policy document claims 90-day automated cleanup and export controls that I did not find wired to the deletion UI. Treat that document as aspirational, not as a source for in-app copy.
- Delete the dead usage-stats read of a users collection at `src/services/ai/integrations/secureAIService.ts:113-116`. Rules already deny it, so it can never succeed.

**Stage B. Firestore rules, phase 0.** Compatible with every client in the field today, so it does not need the app release. This is the highest-value hour in the whole plan.

- oneTimeCodes: allow get, deny list, deny create and delete, allow update only when the stored doc is unused, the update sets used to true, and the changed keys are limited to the four usage fields. This closes the "anyone can mint a 365-day premium code" hole. Redemption keeps working because it does get then update.
- verifiedEmails and premiumUsers: deny read, allow create, deny update and delete. I found no client reader. The two read helpers in the Firebase service have no callers outside their own file.
- fcm_tokens and user_reminders: deny read, allow create and update. Client writes are set calls, so they still work.
- Verify with the rules unit-test SDK against the emulator, and diff the deployed rules against the repo first. Deploying is Cris's action.

**Stage C. Native, SDK, and billing.** This gates every store submission and is the largest item.

- SDK. Apple has required the iOS 26 SDK for uploads since April 2026 and Play requires target API 36 for updates since August 31, 2026, both cited in the setup guide. Expo 52 satisfies neither. unverified — my knowledge says SDK 54 is the first with Xcode 26 and API 36 support and that SDK 55 is current. The builder must confirm the current stable SDK, the New Architecture default, and whether expo-av survives in that SDK. Seven source files import expo-av.
- Billing. expo-in-app-purchases is archived and predates StoreKit 2 and Play Billing 7. Candidate replacements are react-native-iap, expo-iap, and RevenueCat. uncertain — API surfaces and current Billing Library support must be verified against each package's changelog at build time. My recommendation is RevenueCat, because SEC-02 needs server-verified expiry, restore, and revocation, and Cris has no backend source to host receipt validation. The alternative is expo-iap plus an edge function that calls the App Store Server API and Play Developer API, which needs an Apple key and a Google service account on the server.
- Entitlement, part two. Restore and purchase write real expiry from the store answer. Never downgrade a paid-legacy user on a network failure. Downgrade only on a definitive "no active subscription" from the store.
- Android signing. The `.easignore` file excludes android and ios, so EAS regenerates the Gradle config and the tracked debug signing never reaches a cloud build. unverified — whether past store builds were EAS builds. Resolution is to confirm EAS holds the upload keystore, then either remove the debug release signing from the tracked file or drop the tracked native directories. Dropping them requires moving the splash storyboard reference out of app.json. No key rotation.
- Readiness evidence. The blocked records in the readiness script flip only with a written device report. That gate stays.

**Stage D. Backend identity and atomic grants.** Server work can start in parallel with C. The client half ships in the Stage C build.

- Anonymous auth. Nothing signs in today. The compat auth package resolves to its browser build on Metro, which means in-memory persistence and a new user on every launch. The client must call the modular initializer with React Native persistence from the auth react-native entry point before any compat auth access. The compat instance is created at module load in `src/config/firebase.ts:13`, so import order matters. Verify with a restart test that the uid is stable.
- AI and speech proxies. Send the Firebase ID token, verify it in the edge function, rate-limit per uid. Today every device is the string anonymous.
- Redemption moves to an edge function using the admin SDK in a transaction. Email binding stays a Cris decision, see below.
- Rules phase 1 and 2. Phase 1 requires auth on new writes while accepting legacy device-id docs. Phase 2 requires owner match and denies client writes to oneTimeCodes entirely. Trigger phase 2 by measured adoption: count docs with a uid versus without.
- Dead sender. The migration summary states the scheduled reminder sender was never migrated. If that is still true, the reminder and token collections feed nothing. Decide keep or kill before investing in owner-scoped reminder documents.

**Stage E. Release.** Lint and audit counts are unknown because I could not run them here. Both must reach zero without rule changes. Then the device checklist, readiness records, and one TestFlight build.

## Idempotent completion contract

Completion identity does not exist today. The entry type has no id, history appends unconditionally, and the timer fires completion inside a state updater. The contract:

1. Every completion carries a UUID assigned when the routine starts. The engine rejects entries without one. The simulator screen must supply them too.
2. The engine keeps an in-flight map keyed by id. A second call with the same id awaits the first. The timer hook sets a completed ref once per start.
3. Write order is history first, awards second. The two history keys are written together and read back. If either is missing, the other is rolled back and the engine returns a storage failure with no award.
4. After awards, user progress records the id in a bounded processed list. An id present in history but absent from that list is a pending completion.
5. Reconciliation runs on app start and before each new completion. It awards pending ids exactly once. Award math reads history, so an entry already present cannot be double-counted. That is the no-lost-rewards guarantee: anything that reached history gets paid.
6. Entries with no id are legacy and untouched.

Tests: same id twice, storage failure, a thrown error between history and progress save followed by reconcile, and two concurrent calls.

## Decisions only Cris can settle

1. Which App Store Connect app and team is live. Still open from the first advisory.
2. Whether Google Play is a live channel at all.
3. Supabase project access. Can the edge function source be downloaded, is any cron sender running, and has the exposed OpenRouter key been rotated.
4. Firebase console access for the flexbreak-28ad0 project, to confirm deployed rules match the repo.
5. Billing: RevenueCat, or self-hosted validation with Apple and Google server credentials.
6. Real AdMob app IDs. app.json ships Google's sample app IDs while release unit IDs belong to a different publisher. Ads off is an acceptable answer.
7. Whether promo and family codes are meant to be transferable, and whether any live user redeemed one offline.
8. Whether EAS already holds the Android upload keystore.

Scope deltas against the plan: add rules phase 0 as its own immediate item, add the two extra Flex Save refill sites, shrink the reminder fix, add completion identity and reconciliation, retire the offline redemption path now rather than with the backend, deny reads on the email collections immediately, and mark the remote reminder path as possibly dead rather than something to harden.