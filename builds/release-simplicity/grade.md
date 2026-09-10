# Preview grade

Verified Fable result; read-only.

Analysis complete. Writing up the grade now.

**Verdict: no blocking findings. All six criteria pass on the code as it stands, with two items I could not verify because Bash is disabled in this session.**

Evidence source for each row is a file I read this session. I did not run tests, lint, or any remote action.

| # | Criterion | Result | Evidence |
|---|---|---|---|
| 1 | Manual-only, main-only, protected env, existing CI, serialized, no submit | PASS | Workflow has only `workflow_dispatch`, both jobs gated on `refs/heads/main`, `environment: production`, `uses: ./.github/workflows/ci.yml`, same `flexbreak-production-release` group with `cancel-in-progress: false` as auto-production. Script sends exactly `build --platform ios --profile preview --wait --json --non-interactive`, no `--auto-submit`; test pins that array. Script also rejects non-dispatch, non-main, and run attempt other than 1. |
| 2 | Exact source/project/platform/profile/distribution and device artifact validated before a link | PASS | `validatePreviewBuild` checks build id UUID, `app.id`, `app.ownerAccount.name`, `app.slug`, `platform IOS`, `gitCommitHash` equals the dispatched SHA, `buildProfile preview`, `distribution INTERNAL`, `isForIosSimulator === false`, `status FINISHED`, and an https archive URL. The EAS CLI 24 BuildFragment in node_modules exposes exactly these fields under `app`, with no `project` field. Sixteen negative cases plus canceled-with-exit-0 fall through to a throw. |
| 3 | Failure gives a plain next step, no raw JSON or signed URL, retry does not cancel | PASS | EAS stdout and stderr are piped, never printed. Summary text is fixed strings plus a build page URL assembled from validated owner, slug, and id, never from EAS output. Catch block never interpolates the caught error. Tests assert the archive URL and a fake token string never appear. Summary and docs tell the operator to inspect EAS first, use fresh Run workflow, never Re-run, and warn a remote build may still be running. |
| 4 | Production gates and ordering unchanged; only identity field corrected; tests reject missing or wrong identity; Android deferred | PASS, with one unverified point | The validator now reads `build.app?.id`; no `project.id` reference remains in scripts, tests, docs, or workflows. Tests reject `{ app: {} }`, `{ app: { id: buildId } }`, and the old `{ app: undefined, project: {...} }` shape. Release platforms stay `['ios']`. Git status shows only the two release files modified, so readiness and ordering files are untouched. `unverified —` I could not run `git diff` to confirm the release.mjs change is limited to that one line. |
| 5 | Operator guide covers preview, merge to TestFlight after qualification, safe retry, public release distinction | PASS | RELEASING.md covers all four in plain click paths, states preview uses production runtime and consumes a build number, and says App Store review and public release are separate operator actions. |
| 6 | Focused tests, lint, type-check, app tests pass | `unverified —` | I counted 17 tests across the two test files, matching the reported focused count. I did not execute anything, so the 137 full, lint, and type-check results are the builder's report, not mine. |

Two non-blocking notes:

- **The committed fixture does not carry the evidence the plan cites.** The sanitized build 37 JSON omits the `app` object entirely, so it cannot show `app.id` equals the project UUID. The claim is still correct, but its proof is the EAS CLI source, not the fixture. Worth a one-line comment in the fixture or plan.
- **EAS stderr is discarded entirely.** That is the right call for credential safety, but it means a signing or credential failure will only be diagnosable from the EAS dashboard, not from the workflow. The docs already point there, so this is acceptable as scoped.
