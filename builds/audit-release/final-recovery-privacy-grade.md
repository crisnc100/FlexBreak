# Final recovery and disclosure re-grade

Read-only Fable5.1 response; verified model and no API error.

**Verdict: PASS on the recovery correction and PASS on the privacy-disclosure scope.** No blocking findings. One design note and two doc nits below. I ran no shell, so test counts stay as reported; every claim here is from files read this session.

## Recovery correction: PASS

The function is named `collectTouchedPaths`, not `changedPathsSince` (`scripts/production-plan.mjs:70`). It first-parent-walks `checkpoint..head` and unions each commit's diff against its first parent with renames disabled and NUL separation (`:72-79`).

- **Direct commits, partial deploy then revert:** `tests/production-revert.test.mjs:16-20` builds A, B, A in a temp repo, asserts the endpoint diff is empty, then asserts the union classifies backend. This is the exact reported bug and the test proves the old approach was red.
- **Equal checkpoint and current:** `:21` asserts an empty list, so a no-op still reports none.
- **Merge commits and rename sides:** `:22-32` merges a feature branch containing a `git mv` from a backend path to `src/` with a mainline README commit in between. Both the deleted and added sides are asserted present and the plan is backend plus mobile.
- **Failed or partial source:** unchanged, failed runs are never candidates (`:27`), so the checkpoint stays behind the failure and the union replays it.
- **First-success bootstrap:** `:39` falls to the constant when no success exists, and the gap check is skipped in that case (`:32-35`). Tested at `tests/production.test.mjs:27,35`.
- **Protections intact:** SHA shape validated before any git argument (`:71`), so no argument injection. Current-tip check still precedes planning (`:90`), each function deploy (`deploy-backend.mjs:61`) and each EAS operation. Ancestry from bootstrap and to head still enforced at `:40`. Merge commits are diffed with two explicit trees, so a merge's incoming side is never dropped.

Unverified in this session: real `git merge-base --is-ancestor X X` returning zero for the bootstrap-equals-checkpoint case. The tests stub ancestry as true. Git documents self-ancestry as true, so I consider it low risk.

## Prior lows: all repaired

- **No-success gaps bootstrap replay:** `production-plan.mjs:32-35` scopes the gap check to when a success exists. Test at `production.test.mjs:35`.
- **.github prose no-op:** `:48` skips README, PR template and issue-template markdown/yaml; everything else under `.github/` still goes to both (`:49`). Tests at `production.test.mjs:46,50`, including a `.js` issue-template file staying conservative.
- **js-yaml declared:** `package.json:82` pins 4.3.2 as a direct dev dependency, mirrored at `package-lock.json:73` and resolved at `:11687-11690`.
- **Docs:** `.github/README.md:3` and `docs/BACKEND_DEPLOYMENT.md:3` now say all six v2 functions. `docs/CI_CD_SETUP_GUIDE.md:76` describes the first-parent union, rename sides and the revert scenario accurately.

## Privacy disclosure scope: PASS

The fetched public policy (`/tmp/flexbreak-public-policy.js:16,19,31-36,42`) states conversations are never stored, nothing is transmitted or shared, and fixed 90/180/365/30-day deletion. The draft contradicts each of those and I checked its substantive claims against source:

- Conversations persist locally (`conversationManager.ts:250-293` AsyncStorage) and are sent remotely (`chat.ts:69-70` OpenRouter and Groq, with provider fallback at `:141`).
- Speech goes to Google (`speech.ts:149`), weather to OpenWeather (`weather.ts:22-23`), email to ZeroBounce (`email.ts:62`), and the "work or school email" wording matches the backend's own messages (`email.ts:54,74`).
- Anonymous Firebase sign-in (`authSession.ts:11`), bearer token plus time zone on every backend call (`backendClient.ts:32-34`).
- Non-personalized flag is set only on banners (`BannerAdComponent.tsx:108`), not on interstitial or rewarded (`adService.ts:70,74,276`). The draft says exactly that.
- Deletion scope and retained diagnostic counts match `localAIData.ts:19` and the in-app dialog at `AIDataManagement.tsx:82,95`.
- Store restore linking multiple identities matches `purchases.ts:329-371`.
- No client analytics, crash reporting or tracking SDK is declared in `package.json` or `app.json`, so the draft does not omit a data flow.

The draft makes no fixed retention, provider deletion, SLA or legal-compliance promise, keeps the existing contact and subject, and is labelled unpublished for the next release (`docs/PRIVACY_POLICY_DRAFT.md:3`). The app still links the live Netlify URL (`SubscriptionModal.tsx:41`, `AboutSection.tsx:103`), consistent with nothing being published.

**Gate enforcement:** `serviceReadiness.privacyDisclosure` is blocked with no evidence (`release-readiness.mjs:43-46`). The loop iterates the canonical keys, not caller-supplied ones (`:50`), so the key cannot be omitted. `tests/release.test.mjs:87-91` proves the other four services plus native-ready still throw on it. In the combined path, preflight runs before the backend step (`auto-production.yml:43-58`) and calls the readiness check for both platforms (`production-preflight.mjs:18-21`), so a combined run fails before any Supabase or EAS side effect.

## Notes, non-blocking

- **Design note:** a backend-only plan never calls the readiness check (`production-preflight.mjs:15` guards on mobile). That is the documented engineering-bootstrap behavior and predates this change, but it means a backend-only main push deploys v2 functions while the public policy is still wrong. Say so explicitly if that is intended.
- **Nit:** `docs/CI_CD_SETUP_GUIDE.md:9` says "five shared" integrations; the record now holds five service keys, so that is correct, but `README.md:3` in `.github` still omits the privacy gate from its blocker summary.

## Remaining external unknowns

Live Netlify source, hosting repository, provider retention and console settings, store privacy declarations, and the actual runs-API ordering remain unverified and outside this read-only pass.
