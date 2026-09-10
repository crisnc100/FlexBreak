# Firebase configuration follow-up review

Read-only Fable 5.1 review, September 10, 2026.

**Verdict: PASS on all five criteria.** No correctness blocker. One evidence-durability gap worth noting below.

**Per-criterion results**

- **Config equals the live-tested candidate: PASS.** All six fields in `firebase.config.js` are byte-identical to `.artifacts/verification/firebase-config-candidate.json`, and the artifact's project and app ID match `firebase-anonymous-live.json`.
- **Coherent project/app identifiers: PASS.** The archived `GoogleService-Info.plist` carries the same API key, sender ID, project ID, storage bucket, and app ID as the new config, with bundle `com.cristianortega.flexbreak`. That bundle matches `app.json` for both iOS and Android. `.firebaserc` and the server-side audience constant in `supabase/functions/_shared/auth.ts` both point at `flexbreak-28ad0`. No other app or sender IDs exist outside `node_modules` and `.artifacts`, so nothing conflicts.
- **SDK anonymous identity and forced refresh have evidence: PASS.** The live artifact dated 2026-09-10 records four checks, all PASS, including token project/provider validation and refresh preserving identity, plus deletion of only the created test account.
- **No gates relaxed, no native files restored: PASS.** Both native readiness records and all five service records in `scripts/release-readiness.mjs` remain `blocked` with null evidence, and there is still no environment override. The only native config files present are under `.artifacts/native-sdk52-before-cng/`, which `.gitignore` excludes.
- **Documentation accurately limits the evidence: PASS.** The activation note states the test used the JS SDK only, that it does not prove React Native persistence across restart, and that readiness gates remain blocked. That matches the artifact's stated limitations. It also states no project or app was created or relinked and no deployment or store action occurred.

**Gap, not a blocker.** The live evidence lives in `.artifacts/`, which is gitignored, and no script that produced it exists in the repository. The committed record is the prose note only. If durable evidence matters for later gate promotion, commit the artifact or the harness that generates it.

**Unverified.** The note's claim that the previously committed app ID and sender ID differed from the console. I had no git access in this session, so I could not read the prior version of the file.

Evidence follow-up: the sanitized live result is now committed as `firebase-anonymous-live.json` beside this review. It includes the previous sign-up failure and identifiers; no API keys, tokens, or test UID are included. The seat observed the current console identifiers and the old-key failure directly. Device persistence remains unverified.
