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
- `OPENWEATHER_API_KEY` is present in Supabase. Runtime weather verification remains pending v2 deployment.
- Apple purchase verification credentials (`APPLE_PRIVATE_KEY_P8`, `APPLE_KEY_ID`, `APPLE_ISSUER_ID`, `APPLE_APP_ID`) were installed in Supabase and each digest matched the supplied value. Signed requests to production and sandbox transaction APIs reached invalid-transaction validation (HTTP 400 / 4000006), while unsigned requests returned 401. This proves credential acceptance only; real purchase, restore, expiry and cancellation remain unverified.
- Expo CLI authentication succeeded for `crisnc100`, and project information confirms `@crisnc100/flexbreak` with the existing project ID. This does not validate the GitHub Expo token or current Apple signing credentials.
- EAS saved credentials identify the intended bundle and team, plus a separate App Store Connect submission API key. Both the distribution certificate and App Store/ad hoc profiles expired April 24, 2026; renewal and validation are required. The latest existing store build is SDK 52 version 2.0.1 build 36 from September 17, 2025. It does not qualify the upgraded SDK 57 source.
- No backend deployment, native build, store upload, Firestore policy publication, or public privacy-policy publication has occurred during this activation follow-up.

Remaining work includes deployed backend integration tests, provider-key rotation review, iOS signing/device/StoreKit qualification, AdMob account configuration, staged Firestore/legacy containment, and privacy-policy publication. Earlier audit documents describe historical states; this note records subsequent account setup and live evidence without declaring the full release ready.

## Apple-only activation scope

The owner deferred Google Play on September 10. Automatic mobile releases now select iOS through a fixed checked-in policy; Android source, generic artifact validation and CI coverage remain. Shared Firebase, backend, AdMob and privacy evidence is still required. Apple-specific purchase/account evidence is separate from deferred Google evidence, and every readiness record remains blocked pending qualification.

Local validation for this scope change: focused production/release/backend/native-signing checks passed (27 tests), the full app/tooling test suite passed (131 tests, no skips), targeted lint and diff whitespace checks passed. Independent review and final PR CI are recorded separately. No Google account creation, API enablement, service-account grants or upload was performed.
