Verified model: claude-fable-5-1; is_error=false

Advisory complete. Verdict, deltas with evidence, and open questions follow.

## Scope verdict

**Right intent, mis-sized in four places.** The plan's direction is correct: audit with evidence, narrow security fixes, one release entry point, native migration as a blocker. But three acceptance lines are over-scoped for a "narrow fix" pass, and the Firestore fix is under-scoped because it is not a rules edit. Details below.

**Over-scoped (cut or re-word):**

- **"Full typecheck enforced without baseline exclusions"** (plan.md:13) collides with "hundreds of preexisting errors" and "narrow fixes." Enforced means red. Red on the release gate means nothing ships until every error is fixed, which is a rewrite, not an audit. Cris must pick: fix-all-first, or a separate type-debt job that reports the count and fails on increase while the release gate runs the checks that are actually clean. Note that `@types/react-native` at 0.72 is installed alongside React Native 0.76 (package.json:67), which ships its own types. Removing it is likely the single biggest error reducer. unverified until tsc runs.
- **"Regression tests for existing core invariants"** (plan.md:8, 12) starts from zero. No test files exist outside node_modules, and no jest or eslint packages are in devDependencies despite `.eslintrc.js` being present. "Restore checks" is really "create a harness." Cut to: harness, tests for what the audit changes, plus a handful of pure-function smoke tests on storage key constants and streak/XP math. Adding jest-expo and eslint is a lockfile change and must be named as such.
- **Redundancy audit across 325 files** is open-ended. Cap it at dependencies plus dead service files, report-only.

**Under-scoped (expand):**

- **The Firestore fix is a two-release sequence, not a rules edit.** Four collections are world read/write (firestore.rules:5-22). Nothing in src ever signs in: no `signInAnonymously`, `signInWith`, or `onAuthStateChanged` anywhere. Reminders write directly to Firestore keyed by a self-generated device id (reminderService.ts:102), push tokens likewise (fcmTokenService.ts:83), and code redemption reads and marks codes then writes verifiedEmails (oneTimeCodeService.ts:139-237). Tightening rules to `request.auth` today breaks reminders and verification on every install in the field. The deliverable has to be: client anonymous-auth plus ownership-scoped rules, a rollout order in the runbook, and rules tested locally with the emulator. Anything else is a rules file that cannot be deployed.

## Findings the plan should carry, with evidence

**Security, ranked:**

1. **Public repo plus open rules equals a public database.** Firebase client config is tracked (firebase.config.js:3-8, GoogleService-Info.plist, google-services.json). With the rules above, anyone can dump every push token, every reminder record including premium status and message text, every verified email, and can create a `free_premium` code granting 365 days of premium (oneTimeCodeService.ts:89-106, 186-227). The `createCode` method ships in the bundle though nothing in src calls it. This is the P1.
2. **Entitlement is local and unverified.** Expiry is computed as now plus one month or year with no receipt validation, admitted in the comment at iapService.ts:270-274. Restore grants a fresh full period from any historical completed purchase (iapService.ts:513-546). Revenue leakage, report only. Changing it touches purchase intent.
3. **AI proxy identity is spoofable and always anonymous.** Client sends `userId: currentUser?.uid || 'anonymous'` (secureAIService.ts:40). Since nobody signs in, every device is `anonymous`, so any server-side daily limit is either shared or absent. Not inspectable from here. The anon key in src/config/supabase.ts:3 is public by design and is not the issue.
4. **AdMob app IDs are Google's sample IDs** (app.json:59-60, publisher 3940256099942544) while adService uses real unit IDs under publisher 9873959079273159 in release (adService.ts:24-32). Mismatched app ID versus unit IDs. Whether ads serve at all in production is unverified.
5. **Gitignore gap.** eas.json:70 references `./google-service-account.json`. No pattern in .gitignore matches that filename; `*serviceAccount*` does not match `service-account`. The file is absent now. Add an explicit ignore before it ever lands. .gitignore:54 is a NUL-corrupted duplicate line, cosmetic.

**Release pipeline, what is actually broken:**

- A push to main triggers both production.yml and build-and-deploy.yml. Each runs its own production build with `--auto-submit` on both platforms (production.yml:182-188, build-and-deploy.yml:239-243). Four store submissions per push, and the tag is pushed twice.
- production.yml:73-83 and staging.yml:65-75 use `npm pkg set`, which edits package.json, then `git add app.json` and commit. app.json is unchanged, so the commit step fails on nothing-to-commit and the build job never runs. Inferred from the YAML, not observed in run logs.
- eas.json:4 sets `appVersionSource: remote` with `autoIncrement: true`, so EAS owns build numbers. Every app.json buildNumber and versionCode bump in the workflows is inert. Version ownership decision: app.json `expo.version` bumped by hand in a PR, EAS owns build numbers, release refuses to run on mismatch, no automated commits.
- build-and-deploy.yml:9-11 exposes EXPO_TOKEN as workflow-level env, including on `pull_request` to main. Fails acceptance line 14 today.
- Android submit goes to the Play `internal` track (eas.json:71). Slack copy says "Submitted for Review" for Play (production.yml:273). Acceptance line 15 should cover Play internal alongside TestFlight.
- All workflows pin Node 18, which is end of life, use `eas-version: latest`, and use the archived `actions/create-release@v1`. eas-cli is a runtime dependency (package.json:29) and should be a dev dependency invoked via npx so the CLI version comes from the lockfile.
- The manual release workflow needs: `workflow_dispatch` inputs for platform, profile, and submit, a `concurrency` group, a protected environment holding the secrets, `eas build --wait --json` then `eas submit --id <build> --wait`, and a hard fail if the ASC app ID for the chosen profile is not the one Cris confirms is live.

**Native readiness, keep as blocker:**

- Expo 52, React Native 0.76, `expo-in-app-purchases` at 14.5 (archived upstream), `expo-permissions` (removed upstream), `expo-av` for audio. Store minimums as of today almost certainly require a newer target SDK than Expo 52's default. unverified against live policy text. The migration is SDK upgrade plus billing library replacement plus an audio library check, and audio and billing are both core invariants. Deliver a migration spec with the exact replacements and the device test list, not the migration.
- `updates.url` and `runtimeVersion` are configured (app.json:70-75) but `expo-updates` is not a dependency, so OTA is inert. Harmless, report as redundancy.

**Dependency redundancy candidates, report only:** `@types/react-native`, `expo-permissions`, `react-native-web`, `@zerobounce/zero-bounce-sdk` (only a commented reference at SubscriptionModal.tsx:357; verification goes through the Supabase edge function), `react-native-clean-project`, `eas-cli` in the wrong section. Firebase is used through both compat and modular APIs across services, two init paths. Consolidation is real but not for this pass.

## Questions only Cris can answer

1. Which App Store Connect app is live: 6738905173 under team K9X8R2S6CD, or 6728844881 under team 7LHNAAUJQ6?
2. Is Google Play a live channel at all, or is this iOS only? versionCode is 4, track is internal, and no service account exists.
3. Does Cris control the Supabase edge function source? Otherwise the AI rate-limit finding stays unverifiable.
4. What are the real AdMob app IDs, or should ads be treated as off?
5. Is enabling Firebase Anonymous Auth acceptable, and is a two-release rollout acceptable: app update with auth first, rules tightened after adoption?
6. Are there live customers whose discount or free-premium standing lives only in verifiedEmails? That decides whether that collection can go read-only for clients.
7. Type-debt policy: red-until-clean, or a separate ratchet job that is not the release gate?