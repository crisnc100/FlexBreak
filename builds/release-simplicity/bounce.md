# Preview bounce

Verified Fable result; read-only.

**Verdict: not PASS. Three required deltas, two operator-card deltas.** Note: the implementation (`iphone-preview.yml`, `scripts/iphone-preview.mjs`, its test, and an edit to `release.mjs`) landed in this worktree while I was reading, so the verdict judges the plan against what now exists.

**Required deltas**

- **Acceptance 4 is now false and the plan must say why.** The production validator in `scripts/release.mjs:36` was changed from `project.id` to `app.id`. That is correct: the installed EAS CLI 24.0.0 build fragment has `app { id, slug, ownerAccount }` and no `project` field (`node_modules/eas-cli/build/graphql/generated.d.ts:22719`). The old code would have rejected every real production build with "Build project mismatch". Record this as a deliberate production fix with that evidence instead of claiming deployment behaviour is unchanged.

- **The failure path sends Cris to logs that are empty.** The preview script pipes both EAS streams and never prints them, so a failure before a build ID exists (ad hoc signing, unregistered device, token) leaves stdout without JSON and the summary says "inspect this workflow's logs". The logs will contain only the generic "Preview failed" line. The test at `tests/iphone-preview.test.mjs:75` locks in that wording. This is the most likely first-run failure. Fix: when no build ID came back, link the stable project builds page on expo.dev, and write the fragment's `error.errorCode` plus a redacted stderr (strip URLs and the token) to the job log.

- **"Serializes with production" is not what the shared concurrency group does.** GitHub keeps one pending run per group, so a preview dispatched while production is running and another production run is queued cancels the queued production run. Unverified in this session, but documented GitHub behaviour. The stated reason, build-number races, is unverified too: `appVersionSource` is remote, so EAS increments server-side. Either use a separate group and drop "serializes" from acceptance 1, or keep it and have the card say a cancelled production push only redeploys on the next push or manual run. The cumulative checkpoint in `production-plan.mjs:27` makes that safe.

**Operator-card deltas**

- New-device registration is still a Terminal command (`eas device:create`, referenced from `docs/RELEASING.md:5`). The outcome promises no Terminal. Name this one exception.
- Merging this branch turns the next production run red: any `.github/` change plans a mobile deploy, and preflight then hits the blocked iOS readiness record. Not a regression, but the card should say "red is expected until readiness records flip; nothing is lost".

**Verified sound, no change needed**

- Separate workflow file, so preview successes cannot become production checkpoints (checkpoint selection filters by workflow id).
- Main-only, dispatch-only, attempt 1, and live-tip freshness are enforced in code, not just by environment policy.
- No submit path exists; the signed artifact URL never reaches the summary; EAS `--json` routes all logging to stderr, so parsing stdout is sound.
- Readiness gates are untouched and the preview never calls them.

One caution: `builds/release-simplicity/preview-build-37.json` is a hand-curated record, not raw EAS output. Do not cite it as schema evidence.
