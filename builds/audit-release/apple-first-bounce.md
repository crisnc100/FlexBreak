# Apple-only release scope — plan review

Read-only cross-family plan review, September 10, 2026. Model `claude-fable-5-1` verified. Recommendations were incorporated before grading.

Reads done. Writing the verdict now.

**Verdict: the plan is sound in intent but under-specifies three places where "Apple-only" is enforced by absence of a caller rather than by code. Fix those and it holds.** Everything below is from files read this session.

**Gap 1: the policy is not wired into the actual upload path.** The plan says the fixed platform policy is shared by preflight and mobile execution. The real executor is `scripts/release.mjs`, spawned per platform by production-mobile. Its input validator still accepts `RELEASE_PLATFORM=android` at release.mjs:15, and its only Android barrier is the readiness record. That makes acceptance criterion 1 false by construction: the day Android readiness is marked ready, any main-dispatch step that runs release.mjs with the Android env variable uploads. No such step exists today, but the criterion says readiness "cannot enable" an upload, and that must be enforced in the script.
- Delta: in release.mjs main, after validation and before the readiness check, reject any platform not in the checked-in policy. Keep the pure validators generic so the existing Android tests at release.test.mjs:48 and :56 remain untouched.
- Add a scope-isolation test: running release main with the Android platform and a fully ready Android record still throws a policy error, not a readiness error.

**Gap 2: policy file location affects cumulative planning.** The plan does not say where the policy lives. Path classification at production-plan.mjs:50 silently skips anything under docs, builds, tests, or any markdown file. If the policy lands there, flipping Android on later will not plan a mobile build. A file under scripts whose name contains "release" classifies as backend plus mobile, which is the conservative outcome you want.
- Delta: name it in the contract, for example a new module under scripts with "release" in the name, imported as a constant by preflight, production-mobile, and release.mjs. Add one classifyPaths assertion for that path.
- Also update the step summary at production-plan.mjs:116, which still prints "iOS + Android internal uploads".

**Gap 3: the readiness split can strand shared blockers.** The current productionAccounts record bundles three unrelated things: Apple team verification, AdMob sample IDs, and the Firebase project check. Only the first is iOS-specific. If "productionAccounts" becomes a per-platform record, the AdMob and Firebase blockers can end up parked on the deferred Android side and stop gating iOS.
- Delta: keep productionAccounts shared with the AdMob and Firebase text. Add per-platform records for store verification and the store account under a separate map keyed by platform. Extend assertReleaseReady with one loop over the selected platform's map. The existing shared loop at release-readiness.mjs:50 stays as is.
- Note the loop iterates the module constant's keys, not the passed records. Preserve that for the new per-platform loop too, or a caller passing a trimmed map can skip a gate.

**Gap 4: workflow input surface needs a guard, not just an absence.** The dispatch trigger has no inputs today, and the plan relies on that. The workflow test at production.test.mjs:75 does not assert it.
- Delta: assert the dispatch trigger has no inputs and that no step env sets the platform variable. Two lines in the existing test.

**Checkpoint and readiness isolation: no change needed.** Checkpoint selection is keyed by run success, and builds are always from the current SHA, so an iOS-only success does not hide Android changes once the policy flips. Android native and service records stay blocked with null evidence. No credential presence check touches Google today, so criterion 3 is trivially met and only needs the negative test the plan already calls for.

**Test churn to expect.** Preflight ordering test at production.test.mjs:57 and the sequencing test at :66 encode two platforms. Change the expected call lists to iOS only and keep the failure-propagation assertion. The docs at docs/CI_CD_SETUP_GUIDE.md lines 74, 76, and 86 still describe Play uploads.
