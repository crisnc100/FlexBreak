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
- Firebase server credentials, OpenWeather credentials, and Apple/Google purchase-verification credentials are absent from that inventory and still need provisioning.
- No backend deployment, native build, store upload, Firestore policy publication, or public privacy-policy publication has occurred during this activation follow-up.

Remaining work includes server credential setup and integration tests, provider-key rotation review, native signing/device/store qualification, AdMob account configuration, staged Firestore/legacy containment, and privacy-policy publication. Earlier audit documents describe historical states; this note records subsequent account setup and live evidence without declaring the full release ready.
