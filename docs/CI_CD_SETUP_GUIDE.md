# FlexBreak CI and store release

The first release is Apple-only; Android source, native safeguards and all CI coverage remain in place for a later release. `scripts/release-platforms.mjs` fixes automatic execution to iOS and the release entrypoint rejects Android even if its readiness later changes. Expanding scope requires a reviewed source change; there is no dispatch or environment override.

Automatic merge-to-main deployment is prepared but currently blocked by unresolved backend/account integration, signed-native and physical-device readiness. No cloud build, store upload, public release or credential verification was performed during this audit.

## Release blockers

All checks remain enforced; resolve any new lint errors or production dependency advisories without suppressing checks. CI also requires typecheck, tests, both mobile JavaScript bundles, pinned Deno backend checks/lint/tests and both staged Firestore policies tested in the real Java 21 emulator. A green bundle export is not a native archive or a device test.

`scripts/release-readiness.mjs` records both native platforms, four shared service/account/public-policy integrations, and separate purchase-verification and store-account records for each platform as blocked. The public privacy claims must be corrected and verified after owner-reviewed publication; see the [policy draft](PRIVACY_POLICY_DRAFT.md) and [public-policy review](../builds/audit-release/public-privacy-review.md). Automatic production and its identical manual retry check this before contacting EAS. These are project readiness gates: they do not claim a generated Expo 57 project is a tested signed archive. A reviewed follow-up must resolve each finding, attach evidence identifying the tested environment, source/build and results, and update every corresponding iOS and shared record for this release; Android records stay blocked and are not iOS prerequisites; there is no override variable.

- iOS: verify a production archive built with Xcode 26 and the iOS 26 SDK or later. Apple requires the SDK for uploads since April 28, 2026. [Apple SDK requirements](https://developer.apple.com/news/?id=ueeok6yw)
- Deferred Android qualification: verify the generated app bundle targets API 36 or later and meets current Play Billing requirements; verify the migrated `expo-iap` purchase/restore/entitlement behavior against the deployed receipt-verification backend. API 36 is required for ordinary app updates from August 31, 2026. [Google Play target API requirements](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en)
- Required before any candidate, including TestFlight: enable and test persistent Firebase anonymous authentication; deploy and test authenticated v2 backend endpoints against the intended environment, including `weather-v2` with server-only `OPENWEATHER_API_KEY`; configure server-side Apple verification credentials and validate sandbox purchase/restore/expiry/cancellation. A JavaScript bundle cannot verify these services.
- Accounts: verify the Apple team; replace the AdMob sample app IDs with account-verified production IDs; verify the retained JavaScript Firebase project `flexbreak-28ad0` account. Unused native Firebase configuration was removed after cloud push registration was retired. Preserve existing identifiers until their intended ownership is established. These are explicit release blockers, not optional setup notes.
- For each platform when releasing it: verify the generated native project and plugins, signing identity and production backend settings; test on physical devices. Merely increasing Expo's version or selecting an EAS image named `latest` provides none of this evidence.

`ios/` and `android/` are generated and ignored by git and EAS, so local Expo runs and EAS use SDK 57 prebuild. Inspect the generated native output, including the generated splash screen. Siri discovery remains unverified; current config carries metadata but no compiled AppIntent implementation. Fixes only in excluded native files will not reach the cloud build.

## One-time setup

Configured and verified during PR preparation: main requires pull requests and passing `quality`, `backend` and `firestore-rules` checks from GitHub Actions, including for admins; force pushes/deletion are disabled. The production environment allows only the main branch and has no per-deployment reviewers. Its `ASC_APP_ID` is 6743581671. Remaining account credentials, Apple team, runtime qualification and public disclosure are still pending.

1. Resolve the blockers above in reviewed changes. Merge is Cris's decision. Keep the human-visible app version in `app.json`; update it in the reviewed release change when needed. EAS remote versioning owns iOS build numbers and Android version codes with `autoIncrement`; the workflow never commits, tags or pushes.
2. Use Node 22 and `npm ci`. The lockfile installs EAS CLI 24.0.0; all commands below use that local CLI. Log into the intended Expo account with `./node_modules/.bin/eas login`, then inspect `./node_modules/.bin/eas project:info`. Confirm owner `crisnc100`, project `e2f2f0ca-229d-4469-9de8-9f69b7f7a724`, and bundle/package `com.cristianortega.flexbreak` against the existing live app. Never relink or create a replacement project to silence an error.
3. In the Expo dashboard, create an access token for the account with access to this project. Create GitHub environment **production**, restrict its deployment branches to **main**, and protect main so merge is the approval boundary. To deploy automatically after merging, do not add per-deployment environment reviewers; adding them is an intentional manual pause. Store `EXPO_TOKEN` as an environment secret. CI does not receive this token. Tokens are created through Expo account settings; `whoami` does not issue access tokens.
4. Confirm the actual existing App Store Connect app and Apple developer team. The actual existing App Store Connect app ID is 6743581671; previous production/TestFlight profiles contained conflicting IDs, now removed. The Apple team still needs account verification. Set environment variables `ASC_APP_ID` (numeric App Store Connect app ID, not bundle identifier) and `APPLE_TEAM_ID` (ten uppercase letters/digits). The iOS build-and-submit path requires both. Do not guess these values from old configuration. Confirm the team for stored build credentials separately.
5. Run `./node_modules/.bin/eas credentials --platform ios` interactively to configure the existing bundle's distribution certificate, provisioning profile and App Store Connect API key for EAS Submit. Preserve the existing signing keys. Google Play account/service-account creation, permissions, credentials and uploads are deferred; none is required for this Apple release. [EAS Submit setup](https://docs.expo.dev/submit/introduction/)
6. Configure the EAS **production** environment with the app's required runtime/build values; GitHub job variables are not automatically remote build variables. Client-visible `EXPO_PUBLIC_*` values are embedded in the app and cannot contain server secrets. Confirm the resulting Firebase/proxy/ad configuration against production. Use `eas build:version:set` interactively for iOS if remote build numbers are not initialized, using the current store numbers as the starting point.

## Local checks and CI

```sh
npm ci
npm run lint
npm run type-check
npm test
npm audit --omit=dev --audit-level=high
npm run export:mobile
node --test tests/production*.test.mjs tests/backend-deploy.test.mjs tests/release.test.mjs tests/native-signing.test.mjs
```

`ci.yml` runs on pull requests and pushes to staging/develop; main runs it once through `auto-production.yml`, and is reused by automatic production and legacy containment. Its checks fail normally; there are no placeholder tests, audit exceptions or continue-on-error release gates. The backend job pins Deno 2.9.6 and runs `deno task --config supabase/deno.json check`, `deno lint --config supabase/deno.json supabase/functions supabase/tests`, `deno task --config supabase/deno.json test`, and `deno audit` from `supabase/`. The Firestore job pins Firebase CLI 15.30.0 with Java 21 and uses only demo emulator projects; see [rules validation and staged rollout](FIRESTORE_RULES_ROLLOUT.md). App TypeScript intentionally excludes these separate runtimes; their mandatory jobs provide their own checks. All jobs have read-only repository permissions and checkout the event's immutable SHA without saved Git credentials. PR events check their merge SHA; production checks the immutable main SHA captured by push or fresh dispatch. Configure repository rules to require CI and protect main, since untrusted changes to workflow code must not reach the release branch.

## One-time device qualification before opening the release gate

Automatic mobile deployment remains closed until reviewed evidence exists, including on a fresh manual retry. Obtain that evidence through a separately authorized engineering qualification build. The `preview` profile extends `production`, inheriting its environment, Node version, Hermes/minification settings and Release configuration, but produces an internally distributed signed physical-device build: iOS ad hoc (not simulator) and Android APK. It is not a store artifact and cannot pass the release helper's production/store artifact validator.

First complete account, backend and credential setup above, select a reviewed source revision, run the local/CI checks, and record its SHA. Register each iOS test device with the intended Apple team before building. The following are prepared manual commands, not actions performed by this audit:

```sh
./node_modules/.bin/eas project:info
./node_modules/.bin/eas device:create
./node_modules/.bin/eas credentials --platform ios
./node_modules/.bin/eas build --platform ios --profile preview --wait --json --non-interactive > qualification-ios.json
```

These commands create remote builds and consume build numbers, but do not submit or publish anything. Inspect each returned build ID/status, source SHA, project, platform, archive and build logs. Install the iOS internal-distribution link on registered devices. Android qualification builds and Play setup remain deferred. Record SDK/toolchain and resolved billing versions, signing identity, OS/device identifiers, installed build number and the device verification results below. Exercise the intended authenticated backend, persistent identity, weather, voice, deletion and offline/error cases with that exact binary. Record every remaining failure rather than declaring readiness from a successful build.

An internal APK/ad hoc build does not prove store-distributed billing behavior or the final store archive. If those checks require a store-signed artifact, prepare a separately authorized qualification archive with the same reviewed revision and production profile:

```sh
./node_modules/.bin/eas build --platform ios --profile production --wait --json --non-interactive > qualification-store-ios.json
```

This is an engineering evidence path, not a readiness override or automatic submission. Keep the release gate blocked until the required archive and real sandbox purchase/restore/expiry/cancellation evidence is complete. Where installing through TestFlight is necessary, obtain separate authorization for that qualification upload and manage it explicitly in the store; none of these commands uploads it. A reviewed report must link the exact artifacts, backend environment and results before readiness records change. The normal release subsequently builds a fresh validated store artifact from the approved main SHA.

The older `testflight` profile remains because `docs/updatesAfterTest.md` references it; those historical commands are not this qualification or release procedure. Use `preview` for internal device qualification and `production` for the reviewed store path.

## Automatic production after one-time setup

Merging to **main** triggers `auto-production.yml`: full reusable CI, cumulative deployment planning, every required preflight gate, then v2 backend deployment before iOS build/upload. The mobile destination is **TestFlight processing**. No public review or public rollout is automated. The iOS upload uses a fresh production/store build and the exact validated build ID; no `--latest`, fire-and-forget submission or artifact guessing is used.

Docs/tests-only cumulative changes report **planned: none** and perform no remote operation. Backend-only changes deploy the six v2 handlers without native builds. Mobile changes build/upload iOS only. Shared automation and unknown files conservatively affect both backend and mobile planning. Android-only source changes can conservatively rebuild iOS, but never trigger an Android upload. Legacy source changes may trigger v2 redeployment but never deploy legacy handlers. Firestore rules, secrets and remote Firebase functions remain separate operator actions.

The planner compares the current immutable SHA with the newest successful run of this exact new workflow, including successful identical manual retries and no-ops. Bootstrap is explicitly reviewed main SHA `2adf4b6a70812507bcd3fe7165239661ebedff7d`. Cumulative planning unions paths touched by every first-parent transition since the checkpoint, including skipped pending commits, deletions and both sides of renames. A failed partial deployment followed by a source revert still redeploys the affected backend or rebuilds iOS, even when the final files equal the checkpoint. This conservative replay restores the intended current source. Failed/partial runs never advance the checkpoint. API errors, missing/deleted history newer than the checkpoint, foreign workflow metadata, pre-bootstrap or nonancestor checkpoints fail closed; do not replace the baseline to hide them. A reviewed recovery must reconstruct the last complete deployment before updating checkpoint policy.

GitHub's production concurrency never cancels an in-flight run but can replace a pending one and does not promise dispatch order. The planner and every remote mutation require this run's SHA to remain the **current main tip**. A stale queued/in-flight run fails rather than deploying older source or silently switching commits. No-op jobs still execute and report their plan. These checks prevent rollback even when a newer partial run already changed the backend.

After failure, inspect EAS/store/backend state and use Actions → **Automatic production deployment** → **Run workflow** on **main**. This is the same complete cumulative operation, with no partial scope or build-only inputs. Never use GitHub **Re-run jobs**; attempts above one are rejected. A retry after a partial iOS build/upload failure may build/upload iOS again with a new build number. This is intentional; exact-artifact validation still applies to each new upload. Optional environment reviewers add a deliberate extra click; ordinarily the protected main merge is the approval boundary.

Preflight checks all required readiness records, the selected iOS target's configuration, token presence and CLI versions before any backend side effect. Actual Supabase and Expo tokens are isolated to their respective execution steps and never inherited by CI. Backend deployment success alone does not establish runtime health or unlock mobile readiness. See [backend bootstrap, containment and verification](BACKEND_DEPLOYMENT.md).

A successful iOS submission means upload to App Store Connect for TestFlight processing. Wait for processing and configure testers/compliance there. Android uploads are disabled by the checked-in release policy; future Play internal testing requires a reviewed scope change and independent Android evidence. Public review/release remain separate console decisions. A completed workflow does not mean the app is publicly live.

## Device verification and recovery

Before declaring native readiness, record device/OS/build identifiers and results for routine selection and completion; timer/background/resume; XP, challenges, streaks and FlexSave; existing progress after upgrade; free/premium boundaries and purchase/restore/cancel; coach; reminders; audio; Siri on iOS. Test release binaries against the intended services, including offline/error behavior. Store billing needs sandbox/test accounts and physical devices.

If CI fails, use its first failed check and the audit report; do not bypass it. If build validation fails, inspect the selected EAS build's metadata and logs. Captured build JSON is at `$RUNNER_TEMP/flexbreak-build.json` while the runner exists; the EAS dashboard retains build records. A runner timeout/cancellation can leave a remote build or submission running: inspect EAS and the store before retrying. A fresh retry creates a new build and advances remote build numbers. Submission errors can include signing/team mismatch, unavailable credentials, duplicate build numbers, store processing or policy rejection. Correct the actual cause and confirm the existing artifact's status before choosing a recovery action.

There is no automated rollback. A public-store rollback generally needs a newly built version with a higher build number and store review; preserve the previous source and release evidence. Stop or pause rollout in the relevant console when appropriate. This workflow deliberately provides no OTA or automatic public-release action. The inactive `runtimeVersion`/`updates` configuration was removed because this app does not install `expo-updates`. App changes require a new store binary; adding an OTA runtime would require separate implementation and validation.

See [native migration and guarded dependency patches](NATIVE_MIGRATION.md) for source changes and validation limits.

The authenticated backend deploys through the same automatic workflow; see [engineering bootstrap and separate manual legacy containment](BACKEND_DEPLOYMENT.md). Its deployment success does not satisfy the service readiness records without the required integration evidence.
