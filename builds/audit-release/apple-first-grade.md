# Apple-only release scope — independent grade

September 10, 2026. Read-only cross-family review by `claude-fable-5-1`; model usage verified and no API error.

Review complete. All five criteria pass on the evidence read this session, with two minor notes and one item I could not verify.

**Verdict: PASS on all five criteria. No correctness regressions found.**

**1. Automatic execution invokes only iOS. PASS.**
- The policy is a frozen single-element list in `scripts/release-platforms.mjs`, and nothing reads an environment variable to build it.
- Both the preflight loop and the mobile runner iterate that list at production-preflight.mjs:19 and :26. The mobile step at production-mobile.mjs:4 sets the platform per iteration, so a caller-supplied value cannot leak through.
- The release entrypoint rejects a non-policy platform at release.mjs:73, after input validation and before the readiness check, so a ready Android record cannot enable an upload. The test at release.test.mjs:113 proves this with fully ready Android evidence and confirms the readiness callback never ran.
- The workflow has no dispatch inputs and no platform environment variable at any level. The test at production.test.mjs:79 to :85 asserts all three, and it passed in both logs.

**2. Preflight gates everything before backend deployment. PASS.**
- Workflow ordering is preflight, then backend, then mobile. The test at production.test.mjs:92 asserts this from the parsed YAML.
- With mobile planned, preflight requires the Expo token, exact EAS config, numeric ASC app ID, ten-character team ID, and a full readiness pass for iOS covering all four shared services, both iOS platform records, and native evidence. The test at production.test.mjs:61 to :62 covers each missing credential, and release.test.mjs:89 covers the privacy blocker specifically.

**3. Google credentials and Android evidence do not gate iOS, and evidence is not shared. PASS.**
- Required keys come from the module constant, and the lookup is per platform at release-readiness.mjs:76 to :79. An Apple-only record map passes for iOS and fails for Android on the store-verification key, proven at release.test.mjs:99 to :101.
- No Google credential check exists anywhere in the preflight or release path. Grep for the policy and platform symbols found no Google-specific gate.
- The shared productionAccounts record still carries the AdMob and Firebase blockers, so the bounce's stranded-blocker concern was addressed.

**4. Existing coverage and CI intact. PASS.**
- Full run: 131 tests, 0 failures, including the checkpoint revert test, native signing, native billing, and all history validation tests.
- Android validation is retained: build result at release.test.mjs:26, input validation at :50, submission config at :58, native blocker at :63.
- The CI workflow still exports both bundles, runs the Deno check, lint, test, and audit, and runs both Firestore rule policies in the emulator. It was not modified.
- Cumulative planning treats the new policy file as backend plus mobile, asserted at production.test.mjs:51.

**5. Docs accurate, no operations or promotions. PASS.**
- Every readiness record remains blocked with null evidence.
- Both docs now describe Apple-only automatic deployment, deferred Play setup, and the policy-based Android block. The step summary at production-plan.mjs:116 no longer mentions Android uploads.
- The only remaining Android upload text is an unreachable ternary branch at release.mjs:85. It is dead under the policy, not a doc claim.

**Notes, none blocking.**
- Targeted lint is listed in the plan's validation, but no lint log was provided. Lint result: unverified.
- Cosmetic: docs/CI_CD_SETUP_GUIDE.md:23 has a missing space in "is6743581671". Without a diff I cannot tell if it predates this change.

Parent follow-up: the reported documentation spacing typo was fixed. Targeted lint was rerun separately; deterministic results are recorded in activation-progress.md. No readiness record was promoted.
