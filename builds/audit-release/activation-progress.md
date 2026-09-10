# Production activation — September 10, 2026

PR #5 merged as `6a52dfee13fcf40c431a313339a32ea37d982f45`. All three CI jobs passed in production run 34488620250; preflight stopped at the missing Supabase token before deployment.

## Firebase configuration follow-up

Success criteria: the app configuration matches the owner's existing Firebase project/app, the Firebase JS SDK can sign in anonymously and refresh a token for that project without changing identity, and release readiness remains blocked until device/backend qualification is complete.

The owner enabled Anonymous authentication. The console now reports Enabled for `flexbreak-28ad0`, under the owner's personal account. A real sign-up using the previously committed API key returned HTTP 400 with `API_KEY_INVALID`. The committed app ID and sender ID also differed from the current console.

The archived iOS configuration matches the existing registered app: project number `1008736824952`, app ID `1:1008736824952:ios:f061ee871cb11dbda1478d`, bundle `com.cristianortega.flexbreak`, Apple team `7LHNAAUJQ6`. Its public Firebase API key successfully authenticated against that same project. `firebase.config.js` now uses this coherent configuration. No Firebase app/project was created or relinked, and native configuration files remain excluded.

Live qualification on September 10: the installed Firebase JS SDK created one anonymous test account, verified token audience/issuer/provider, forced token refresh while retaining identity, and deleted only that newly created test account. All passed. This does not prove React Native persistence across device restart; the readiness gates remain blocked.

Local validation: `npm run type-check` passed. An exact comparison of the updated exported configuration with the live-tested candidate passed, as did an assertion that all native and shared service readiness records remain blocked.

## Account setup verified

- GitHub production secret `SUPABASE_ACCESS_TOKEN` exists; its deployment permissions are not yet tested.
- GitHub production variables: `ASC_APP_ID=6743581671`, `APPLE_TEAM_ID=7LHNAAUJQ6`.
- Supabase's current custom-secret inventory contains `OPENROUTER_API_KEY`, `GROQ_API_KEY`, `GOOGLE_SPEECH_API_KEY`, and `ZEROBOUNCE_API_KEY`. Values were not revealed; provider validity/rotation remains unverified.
- A dedicated Firebase server account now has conditional `roles/datastore.user` access to the default database. Its Base64 credential was installed in Supabase and verified by digest; the alternate JSON credential is absent. OAuth exchange and isolated Firestore transaction/read/write/delete probes passed. The actual production database adapter also passed in local Deno using the Base64 credential. These are not deployed Edge Function checks.
- `OPENWEATHER_API_KEY` is present in Supabase. Subsequent deployed current/forecast checks passed; see the bootstrap evidence below.
- Apple purchase verification credentials (`APPLE_PRIVATE_KEY_P8`, `APPLE_KEY_ID`, `APPLE_ISSUER_ID`, `APPLE_APP_ID`) were installed in Supabase and each digest matched the supplied value. Signed requests to production and sandbox transaction APIs reached invalid-transaction validation (HTTP 400 / 4000006), while unsigned requests returned 401. This proves credential acceptance only; real purchase, restore, expiry and cancellation remain unverified.
- Expo CLI authentication succeeded for `crisnc100`, and project information confirms `@crisnc100/flexbreak` with the existing project ID. This does not validate the GitHub Expo token or current Apple signing credentials.
- EAS saved credentials identify the intended bundle and team, plus a separate App Store Connect submission API key. Both the distribution certificate and App Store/ad hoc profiles expired April 24, 2026; renewal and validation are required. The latest existing store build is SDK 52 version 2.0.1 build 36 from September 17, 2025. It does not qualify the upgraded SDK 57 source.
- The six v2 backend functions were subsequently deployed through the documented one-time engineering bootstrap from reviewed merged source `6a52dfee13fcf40c431a313339a32ea37d982f45`. The source CI jobs had all passed, and main was checked before every deployment command. Read-back reports all six ACTIVE at version 1, with gateway JWT verification disabled as intended because each handler validates Firebase tokens. Legacy endpoint deployments and Firestore rules were not changed. Runtime qualification is recorded separately. No native build, store upload or public privacy-policy publication has occurred during this activation follow-up.

Remaining work includes deployed backend integration tests, provider-key rotation review, iOS signing/device/StoreKit qualification, AdMob account configuration, staged Firestore/legacy containment, and privacy-policy publication. Earlier audit documents describe historical states; this note records subsequent account setup and live evidence without declaring the full release ready.

## Apple-only activation scope

The owner deferred Google Play on September 10. Automatic mobile releases now select iOS through a fixed checked-in policy; Android source, generic artifact validation and CI coverage remain. Shared Firebase, backend, AdMob and privacy evidence is still required. Apple-specific purchase/account evidence is separate from deferred Google evidence, and every readiness record remains blocked pending qualification.

Local validation for this scope change: focused production/release/backend/native-signing checks passed (27 tests), the full app/tooling test suite passed (131 tests, no skips), targeted lint and diff whitespace checks passed. Independent review passed all five acceptance criteria. Final code revision `2fa4a58` passed all required GitHub CI checks in run `34496454678`. No Google account creation, API enablement, service-account grants or upload was performed.

## Additive backend bootstrap and live checks

The published Firestore rules were read directly before deployment. Their default-deny rule protects the new `backend*` collections; the five legacy publicly writable collections remain a separate containment issue. No rules were published during this step.

The six fixed v2 functions were deployed sequentially with Supabase CLI 2.117.0 from an immutable archive of the merged source, stopping on command failure and checking main before each command. All commands succeeded and inventory read-back confirmed six ACTIVE version-1 functions. No legacy handler was redeployed or removed.

[Live backend qualification](backend-live-qualification.json) records 44 passing checks: OPTIONS/method handling, missing/malformed-token rejection, valid anonymous Firebase authentication reaching malformed-body validation on all six routes, own-user database/input validation, and real OpenWeather current and forecast responses. The email test only checked local rejection of a personal address; the purchase test only rejected an unsigned proof. No real chat, transcription, successful work-email validation, redemption or StoreKit purchase was exercised.

Cleanup deleted the three records created for the dedicated anonymous user and that Auth account. Shared aggregate budgets were deliberately left intact. These results establish limited deployed behavior, not full integration readiness; every readiness record remains blocked.

## Independent evidence review

The read-only Fable review completed with PASS (`is_error: false`; model identity `claude-fable-5-1`). It verified the six additive deployments, all 44 check results, dedicated-user cleanup, weather-only provider success claim and blocked readiness. The qualification JSON is a sanitized, curated copy of the ignored raw probe output: the dedicated UID was removed and source/limitations were added.

Caveats: no post-deployment rules or legacy inventory snapshot was taken; the unchanged claim rests on the commands performed. Shared project/weather budget counters and the project concurrency lease record were left in place. The reviewer could not compare git source; the seat subsequently ran `git diff 6a52dfe -- supabase/functions` on September 10 and confirmed an empty diff. No probes were rerun for this documentation update.
