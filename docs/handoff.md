# FlexBreak — resume here

Updated September 10, 2026. Cris requested this handoff while Apple release activation was in progress. Read this before making changes.

## Latest device follow-up — September 10, 2026

This section supersedes the older activation snapshot below. Current worktree is unchanged; branch is `build/ios-preview`, HEAD `823219bb31b99ff3d9ad292b1efbd8ac7b4978ce`. PRs #6 and #7 were merged by Cris. Signing was renewed through September 2027. Preview39 (`149e027d-bee9-46eb-a67a-6a56051092e4`) is installed on his phone. One-click iPhone preview workflow is merged. Production remains blocked by readiness preflight; quality/backend/rules CI passed on the post-merge run.

Uncommitted fixes now in this worktree: native blue splash without square logo, cold first-video loading/error isolation, accessible coach catalog selected before transitions, real iOS AdMob app ID, flattened native voice recording settings, and shorter ordinary coach replies. See `builds/qualification-followup/plan.md` and review artifacts there. All155 tests pass; type-check and lint pass (lint has existing warnings). Native device checks still required on a new preview. No readiness gate was overridden.

Cris confirmed voice shows Recording Failed immediately, before transcription. Native recorder constructor was receiving nested iOS settings, leaving Android extension/default fields at the constructor boundary; corrected and regression-tested against installed Expo normalization. Actual recording/transcription remains unverified. The first timed stretch blankness has a reproduced cold-source component defect, but exact device timing is untraced.

Typed sleep/concentration chat produced one authenticated backend requests record. After restart, Cris reports another answer, but read-only snapshots through20:02 UTC show no new request attempt. This does not prove restart identity persistence or a second live provider call. Private snapshots are ignored under `.artifacts/qualification/`; never expose identities.

AdMob owner dashboard confirms real app ID in current app.json, but shows Requires review/Limited ad serving because App Store listing lacks a developer website. Existing privacy site is `https://flexbreak-privacy-app.netlify.app/`; its public text is outdated. No website or App Store setting was published/changed. Correct app-ads.txt is in repo; accurate policy draft in `docs/PRIVACY_POLICY_DRAFT.md` still needs concrete owner publication approval.

Independent reviews and both mobile exports passed. Next: obtain explicit commit authorization per Cris doctrine, commit and create one new preview for device checks. Do not merge or declare production ready.

## Goal

Complete the security/redundancy/test audit and fixes for the live FlexBreak app while preserving its specific core features, then make production backend deployment and Apple/TestFlight uploads automatic after a protected-main merge. The original audit PR was merged by Cris. Activation and qualification remain unfinished. **Cris explicitly deferred Google Play: focus on Apple; do not create a Play account, enable its API, provision Play credentials or upload Android builds.** Preserve Android code and CI coverage.

## Current State

- **Work only here:** `/Users/cortega/Documents/Projects/personal/FlexBreak/.worktrees/flexbreak-audit-release`.
- Trunk `/Users/cortega/Documents/Projects/personal/FlexBreak` is parked on main; do not edit there. This is one continuing goal/worktree.
- Branch `fix/firebase-production-config`; current pushed HEAD `2fa4a58caaf76c978a4aba4ea251d437339acacc`.
- Base/merged audit source: `6a52dfee13fcf40c431a313339a32ea37d982f45` (PR #5, merged by Cris).
- **PR #6 OPEN, not merged:** https://github.com/crisnc100/FlexBreak/pull/6. Title: “Fix Firebase authentication and target Apple-only automated releases”. Read back at handoff: quality, backend and firestore-rules all SUCCESS on HEAD, run `34496454678`. Supabase Preview is skipped, not a required failure.
- Assigned local URL `http://localhost:8081` is **not running**.
- All checked-in release readiness records remain **blocked**. Credentials/probes do not qualify a native release. No new native build, TestFlight upload, public App Store release, Firestore rules publication or privacy-policy publication has occurred.
- **Six v2 functions ARE NOW DEPLOYED** to existing Supabase project `tkudukjujfztyiqijvjn`, version 1, ACTIVE: `ai-chat-v2`, `transcribe-audio-v2`, `verify-email-v2`, `redeem-code-v2`, `verify-purchase-v2`, `weather-v2`.
- This was the documented one-time additive engineering bootstrap, from an immutable archive of merged source `6a52dfe`; full source CI had passed and main SHA was checked before every sequential command. Legacy handlers were not redeployed/deleted. Normal automatic production remains gated.
- **44 live checks passed**: CORS/method handling, missing/malformed-token denial, valid anonymous Firebase auth reaching malformed-body validation on all six routes, own-user database/input validation, and real OpenWeather current/forecast. No real chat, speech, successful work-email, redemption or StoreKit transaction was exercised. Three dedicated-user records and the temporary Auth account were deleted; aggregate budgets were deliberately not reset.
- The immediate Apple blocker: EAS's distribution certificate and App Store/ad hoc provisioning profiles expired **April 24, 2026**. A fresh Apple login is required to renew them.

## Files in Flight

These changes were not committed/pushed when the handoff began; preserve them:

- `/Users/cortega/Documents/Projects/personal/FlexBreak/.worktrees/flexbreak-audit-release/builds/audit-release/activation-progress.md` — updated with successful bootstrap, 44 live checks, cleanup, existing CI evidence and limitations.
- `/Users/cortega/Documents/Projects/personal/FlexBreak/.worktrees/flexbreak-audit-release/docs/BACKEND_DEPLOYMENT.md` — corrected deployment status from pending to bootstrap completed.
- `/Users/cortega/Documents/Projects/personal/FlexBreak/.worktrees/flexbreak-audit-release/builds/audit-release/backend-live-qualification.json` — new sanitized live evidence; dedicated UID removed, no tokens/credentials.
- `/Users/cortega/Documents/Projects/personal/FlexBreak/.worktrees/flexbreak-audit-release/docs/handoff.md` — this new handoff.

The independent read-only Fable evidence review **completed during handoff preparation: PASS**.

- Result `/tmp/flexbreak-backend-live-grade.json`; `is_error: false` and `modelUsage` containing `claude-fable-5-1` were verified. It supports the six additive deployments, 44 passing checks, isolated cleanup, limited weather-only provider claim and all readiness still blocked.
- No blocking corrections. Caveats to preserve: no post-deployment rules/legacy snapshot (unchanged claim rests on commands actually performed); committed JSON is a curated copy with UID removed and source/limitations added; shared concurrency record also remains; reviewer could not run git to independently compare current backend source with the deployed SHA. Parent did verify that diff was empty before deployment.
- Review result is now recorded in `builds/audit-release/backend-live-grade.md`, with caveats in activation progress.
- No deployment, probe or Apple-login process remains active. Prior deployment session 38948 and probe session 50799 completed successfully. Review was session 51334. Apple credential CLI was canceled at the password prompt; no password was collected.

## Changed This Session

### Already committed and pushed

- `c71a6ac`: fixed invalid/mismatched public Firebase configuration to match the owner's registered project/app. Actual Firebase JS SDK anonymous sign-in, forced refresh retaining identity and deletion of its new test account passed. Physical React Native restart persistence is still unverified.
- `2fa4a58`: fixed checked-in Apple-only release policy in `scripts/release-platforms.mjs`; shared by preflight/execution and enforced by `release.mjs` before readiness or remote work. No env/dispatch override enables Android. Split Apple/Google purchase/account evidence, retained shared Firebase/backend/AdMob/privacy gates, all blocked.
- Preserved cumulative checkpoint/revert recovery, stale-main guards, backend-first ordering, exact source/artifact submission validation, fresh-dispatch retry semantics and every CI job/both bundle exports.
- 27 focused tests and all **131 app/tooling tests** passed, zero skips. Targeted ESLint and `git diff --check` passed. Independent Fable review passed all five Apple-only acceptance criteria. Evidence: `builds/audit-release/apple-first-{plan,bounce,grade}.md`. Full GitHub CI on `2fa4a58` passed.
- App is now Expo **57.0.21**, React Native **0.86.3**; old SDK52 native directories are archived, generated native output is ignored. Do not confuse old EAS SDK52 builds with qualification of current source.

### Account/backend activation completed

- Firebase project `flexbreak-28ad0`, number `1008736824952`; existing iOS app `1:1008736824952:ios:f061ee871cb11dbda1478d`, bundle `com.cristianortega.flexbreak`. Owner enabled Anonymous Auth.
- Dedicated service account `flexbreak-supabase@flexbreak-28ad0.iam.gserviceaccount.com` has only conditional project `roles/datastore.user`, restricted to `projects/flexbreak-28ad0/databases/(default)`. Project has no parent folder/org. Its Base64 credential is installed in Supabase; digest matched and alternate JSON credential is absent.
- Service-account OAuth/Firestore transaction/read/write/delete probes passed. Actual production database adapter also passed locally in Deno with the Base64 credential; subsequent live v2 probes exercised deployed database access.
- `OPENWEATHER_API_KEY` is installed; live current and forecast requests now pass.
- Apple purchase secrets `APPLE_PRIVATE_KEY_P8`, `APPLE_KEY_ID`, `APPLE_ISSUER_ID`, `APPLE_APP_ID` installed and digest-verified. Key ID `HS3C7Z356K`; app ID `6743581671`. Signed synthetic transaction-0 requests reached HTTP 400/4000006 in Apple production and sandbox, versus unsigned 401. **Credential acceptance only, not real purchase verification.** Sandbox flags were not changed.
- Existing Supabase custom keys `OPENROUTER_API_KEY`, `GROQ_API_KEY`, `GOOGLE_SPEECH_API_KEY`, `ZEROBOUNCE_API_KEY` remain from 2025; values/rotation/provider validity unverified. Do not assume weather success qualifies these providers.
- GitHub production secret `SUPABASE_ACCESS_TOKEN` exists; its particular token was not tested. Local Supabase CLI uses a separately authenticated PAT. Existing GitHub `EXPO_TOKEN` exists but its actual permissions remain unverified.
- GitHub production variables `ASC_APP_ID=6743581671`, `APPLE_TEAM_ID=7LHNAAUJQ6` set/read back.
- Expo CLI login succeeded for `crisnc100` / personal Gmail, project `@crisnc100/flexbreak`, ID `e2f2f0ca-229d-4469-9de8-9f69b7f7a724`. No project relink/new project.
- EAS stores a **separate** App Store Connect submission key `R6DQ9F34FY`, matching issuer/team. Do not substitute the In-App Purchase `.p8` for EAS Submit. Saved key existence is verified, current upload authorization is not.
- Latest existing EAS store build: `5eaad36a-41c4-472d-9a89-d05fa873e85d`, SDK52, app 2.0.1 build **36**, September 17, 2025. EAS remote versioning/autoIncrement is configured; static app buildNumber 12 is not the remote latest.
- Live Firestore rules were read before v2 deployment: default deny protects all new `backend*` collections. The five legacy collections remain publicly writable (`fcm_tokens`, `user_reminders`, `verifiedEmails`, `oneTimeCodes`, `premiumUsers`); staged containment remains outstanding.

## Failed Attempts

- Old Firebase public API key returned `API_KEY_INVALID`; old app/sender IDs also mismatched the account. Fixed using the existing owner's verified app configuration, not a new Firebase project.
- Supabase old `.supabase-pat` returned 401. Do not reuse it. Current CLI login works via the newly authorized personal PAT; never print it.
- Supabase secret-list JSON uses `value` for the SHA256 digest, not `digest`. Compare internally; never print actual values.
- `eas credentials --platform ios` without Apple login can display saved credentials but cannot renew expired ones. Trying login required a fresh password; canceled. The owner must enter password/2FA in their Terminal, never chat.
- Python urllib failed local TLS certificate validation for Google Rules API. Node fetch worked with TLS verification intact. Initial Rules API 403 was resolved by supplying `x-goog-user-project: flexbreak-28ad0`; no API/IAM change was required.
- Deno live probe with only `--import-map` picked up the app tsconfig and rejected `jsx: react-native`. Correct invocation uses `--config=supabase/deno.json`.
- Initial source-CI assertion expected the wrong reusable-job prefix. Actual names are `quality / quality`, `quality / backend`, `quality / firestore-rules`; all succeeded for the merged bootstrap SHA. Corrected assertion before any deployment.
- CUA exposed only browser selection/creation/state documentation in this session, no documented interaction methods. Do not invent click/evaluate APIs. Browser tab IDs may be stale because Cris closes tabs.

## Next Steps

1. **Resume the Apple signing login with Cris.** An async request was already sent, with no answer yet: run the following in his Terminal, choose **production**, sign into Apple, then **Build Credentials**, and report when that menu appears. Do not ask for his password or verification code in chat. Do not repeat generic permission requests; account setup is already authorized.

   ```sh
   cd /Users/cortega/Documents/Projects/personal/FlexBreak/.worktrees/flexbreak-audit-release
   ./node_modules/.bin/eas credentials --platform ios
   ```

   Renew the expired distribution certificate/profiles for the existing bundle/team; preserve existing identities and avoid unrelated revocations. Inspect what EAS offers and validate read-back. Stored EAS Submit key is already present.

2. Record the completed PASS evidence review and its nonblocking caveats, then commit/push the operational evidence on PR #6. Update the PR activation paragraph with the actual bootstrap + limited 44-check evidence. Recheck PR/main state first in case Cris merges meanwhile. Never merge yourself.

3. Continue remaining iOS qualification: signed native cloud build using current SDK57 source, current Apple SDK requirements, physical-device auth persistence/core flows, real StoreKit sandbox purchase/restore/expiry/cancellation against the deployed backend. Apple sandbox must be deliberately configured for test transactions; no real customer proof should be used as a probe. Keep readiness blocked until evidence covers each requirement.

4. Complete outstanding shared blockers: actual chat/transcription/email/redemption and quota/deletion integration qualification, owner-verified AdMob production app IDs (current sample IDs remain), public privacy-policy publication, provider rotation assessment, staged Firestore/legacy containment and old scheduler retirement. Do not claim the security audit is fully activated while these remain.

## Key Context and Safe Tooling

- Cris alone merges. Main is protected with required quality/backend/firestore-rules checks and the production environment is main-only without a second deployment approval pause. Pushes to this PR branch are already authorized; never push directly to main.
- Laptop previously got loud. Keep heavy local work sequential, Expo exports one worker. No unnecessary reinstall/full-test loops for documentation edits; let required remote CI run.
- **Always specify personal Google identity/project:** `gcloud ... --account=crisnc100@gmail.com --project=flexbreak-28ad0`. The active default gcloud account belongs to unrelated work agents. Never change/use that default for FlexBreak. Rules REST also needs `x-goog-user-project`.
- Supabase command: `npm exec --yes --package=supabase@2.117.0 -- supabase ... --project-ref tkudukjujfztyiqijvjn`. Local CLI is authenticated. Deployment archive `/Users/cortega/Documents/Projects/personal/FlexBreak/.worktrees/flexbreak-audit-release/.artifacts/bootstrap-main-6a52dfe` is an immutable source extraction, not another worktree.
- Probe command that passed: `npm exec --yes --package=deno@2.9.6 -- deno run --config=supabase/deno.json --allow-env --allow-read --allow-net --allow-sys --allow-write=.artifacts/verification .artifacts/verification/backend-live-probe.ts`. **Do not blindly rerun:** it creates a dedicated user, consumes project/weather budgets, then cleans its own records. All 44 already passed. Inspect evidence instead unless a change/failure justifies another run.
- Authentication/body-validation probes stop before DB writes. Any authenticated valid JSON object charges quota/project budget before route validation. Never reset shared budgets or use existing customer IDs/codes/proofs to make tests pass.
- Sensitive local paths: `.artifacts/credentials/firebase-supabase-service-account.json` (mode600, ignored) and `/Users/cortega/Downloads/SubscriptionKey_HS3C7Z356K.p8`. Use only internally if needed; never output/copy into source. Temporary credential dotenv files were deleted. Supabase cannot read plaintext secrets back. Never dump `.env`, keys, PATs, signed EAS artifact/log URLs or raw credential-bearing tool results.
- Evidence in `.artifacts/verification/`: `backend-bootstrap-source.json`, `backend-bootstrap-deployment.json`, `backend-v2-inventory.json`, `backend-live-probe.{ts,json}`, `firestore-live-rules-before-v2.json`, `firebase-service-account-live.json`, `firebase-database-adapter-live.json`, `apple-credential-setup.json`, `apple-api-credential-probe.json`. These are local operational evidence; only sanitize selected data into committed reports.
- Public privacy URL `https://flexbreak-privacy-app.netlify.app/` still has outdated claims. Prepared accurate copy: `docs/PRIVACY_POLICY_DRAFT.md`; review: `builds/audit-release/public-privacy-review.md`. Owner had logged into Netlify, then closed that tab. Hosting repository not found; no publication performed. Do not invent retention promises.
- Current native/generated and release instructions: `docs/CI_CD_SETUP_GUIDE.md`, `scripts/release-readiness.mjs`, `eas.json`. Siri discovery remains unverified; metadata alone does not establish a compiled AppIntent. Native changes must live in durable source/config/plugins, not ignored generated directories.
- Worktree excludes `.artifacts/` and local `supabase/.temp/` metadata. Do not commit credentials or generated native directories.
- Relevant skills already used: build, advisor, handoff. Apple-only plan and implementation were cross-family reviewed. Fable is read-only (`--tools Read,Grep,Glob`); verify result envelope/model identity. User's standing doctrine authorizes bounded delegation but not author self-grading.

## Open Questions

- Has Cris completed the fresh Apple login and reached Build Credentials? No response was received before the handoff.
- No Google Play decision is pending: it is explicitly deferred.
- Public privacy publication, real-device/StoreKit results and remaining production account details are still outstanding; do not turn these into generic approval prompts before preparing concrete work.
