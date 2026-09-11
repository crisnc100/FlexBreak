# Fable plan review

**Verdict: not ready to build as written.** The direction is right and the safest template already exists in `scripts/iphone-preview.mjs`. But the plan reuses `scripts/release.mjs` pieces that structurally cannot deliver four of its own promises, and it misstates where the Apple IDs live.

**Required changes**

1. **Say how the readiness gate is avoided, structurally.** `release.mjs` calls `assertReleaseReady` unconditionally, and `release-readiness.mjs` forbids env overrides and states these dependencies are required "even in TestFlight/internal testing." The new helper must be a separate entry point that never imports readiness, not a flag on the release script. Add a test that `release.mjs` still cannot skip the gate, and update the readiness comment plus the "automatic store delivery stays blocked" text in `docs/RELEASING.md`, which the new workflow contradicts.

2. **The existing validator cannot produce the failure-stage build link.** `validateBuildResult` throws on any status other than FINISHED, so a failed build yields no sanitized link. Item 4 promises one. Specify a two-phase validation like `validatePreviewBuild` with its finished flag, and require owner and slug checks so the link can be built.

3. **Submission output is currently published raw.** The release script runs submit with inherited stdio, so ASC upload logs and any signed URLs land in the Actions log. Item 4 forbids this. Specify piped streams for submit, exit code as the only truth, and a TestFlight link built solely from the GitHub variable.

4. **The helper must be injectable or item 5 is untestable.** The release script reads process env, spawns the real CLI, and writes the repo's `eas.json`. Specify the preview-style signature with injected run, checkMain, summary, and config read/write, and tests that exercise restoration against a temp copy, never the checked-in file.

5. **Apple IDs are GitHub variables, not secrets.** The handoff records `ASC_APP_ID` and `APPLE_TEAM_ID` as production environment variables, and the existing workflow reads them from `vars`. The plan's context says "secrets include Apple IDs." Correct it so the builder does not wire `secrets.` and get an empty value.

6. **Pin a CLI timeout below the job timeout.** The release script's spawn has no timeout. A job-timeout kill skips the summary write, so the operator gets no failure stage. Use the preview's 340-minute spawn inside a 360-minute job.

7. **State the profile.** An unused `testflight` profile sits in `eas.json`. The validator requires `production`, which is what build 41 used. Name `production` explicitly so nobody switches profiles or loosens the validator.

8. **Decide the wrong-branch behavior.** The preview workflow's job-level main guard makes a non-main dispatch conclude green with everything skipped. The helper's wrong-branch test never runs in that case. Either accept and document the skip, or drop the guard and let the helper fail honestly.

9. **Make the "no backend mutation" claim a test.** Mirror the workflow shape test at `tests/iphone-preview.test.mjs:93` and assert no step references the Supabase token or the backend deploy script.

**Notes, not blockers**

- Checkpoint history stays clean: `selectCheckpoint` filters by workflow id and path, so a separate workflow file cannot pollute it.
- Merging any `.github/` change plans backend plus mobile on the next auto-production run, which will fail at preflight with no mutation. Docs should expect that red run.
- A shared non-cancelling queue keeps one pending run. A main push arriving while the qualification run is pending replaces it with no summary. Item 4's failure-stage promise should say cancellation produces nothing.
- Unverified: whether `eas submit --wait` exits nonzero on a failed submission in CLI 24, and whether the stored App Store Connect key still authorizes uploads. The handoff records the key's existence but says authorization is unverified, and build 41's submission was last seen "in progress." A missing-credentials failure would surface only after a full build has consumed a build number. The plan should state this as a first-run risk.
- Optional: pass a build message naming the run so qualification builds are distinguishable from production builds in the EAS dashboard, since both use the same profile and commit.

See plan.md for resolutions before implementation.
