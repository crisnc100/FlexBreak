# Merge-triggered deployment and PR follow-up

## User direction

After all fixes pass, open a PR. Merging to main should deploy automatically instead of requiring manual workflow dispatch. Cris remains the only merger. PR preparation necessarily includes committing and pushing this task branch; no protected branch push, merge, live deployment or store upload is authorized as part of preparing the PR.

Mobile destination clarification is pending: default proposal is automatic TestFlight / Play internal upload, with public review/release separately approved. Do not assume public publication without the answer.

## Current evidence

Current release/backend workflows are manual-only, share a concurrency group and reuse full CI. Helpers validate immutable source, fixed project/destination, finished exact artifact and awaited submissions. Store/service readiness records intentionally block until actual credentials/device evidence exists. Main is still 2adf4b6a70812507bcd3fe7165239661ebedff7d; no PR exists. Local app113 tests, backend42, Firestore emulator6, full typecheck/lint/export and dependency audits pass. Final read-only Fable follow-up review passed all5bars, found one small toggle/deletion race now being fixed separately.

## Proposed minimal architecture

1. One auto-production.yml workflow on every main push and workflow_dispatch (retry), with the SAME full operation semantics and no partial scope/build-only controls. Workflow-level production concurrency serializes the entire run, cancel-in-progress false. No workflow path filter: a replaced pending main run must not lose its changes. Main CI executes once through workflow_call; standalone CI retains PR/staging/develop only.
2. Plan changes from the last successful run of this exact production workflow on main to the immutable event SHA. Push and manual retry can both be checkpoints because they execute identical planning and full deployment semantics. Successful docs-only/no-op runs may advance the checkpoint because the cumulative diff was considered and no deployable changes were omitted. Failed/partial runs never advance it. Use Actions read-only run metadata, exact repository/workflow/event/branch/validSHA filtering, exclude current run; validate ancestry using full checkout history. If no prior success exists, use explicit reviewed bootstrap SHA2adf4b6a70812507bcd3fe7165239661ebedff7d. Reject malformed metadata, API/history errors and nonancestor checkpoints rather than guessing event.before/latest artifact.
3. A small testable production-plan.mjs classifies cumulative changed paths (add/delete/rename handled safely) into backend/mobile/neither. Backend includes shared/v2 source/dependencies/config. Mobile includes app/src/assets/root package/config/native plugins. Deployment/readiness tooling classified conservatively. Docs/tests-only cause no remote operations; backend-only does not build mobile. No native per-platform optimization needed: mobile changes build/upload both platforms serially, iOS then Android, unless user changes mobile scope. This is one common React Native source.
4. After full reusableCI, a production environment job deploys named v2 functions when needed, then selected mobile builds/submissions through existing helpers. Fail immediately on any operation; prior successes documented as partial. No PR secrets inherited. Supabase token scoped to deploy step, Expo token scoped to mobile step, GitHub token actions:read/contents:read only. Existing hard readiness and exact project/source/profile/artifact gates retained.
5. Remove duplicate manual store entry point. Reduce old backend dispatch to explicit legacy-containment only with a DISTINCT legacy concurrency group because those four endpoints are disjoint from v2. Otherwise a queued manual-only job could replace pending automatic production work. No automatic legacy enablement, rule publication, code backfill, key rotation or function deletion. Manual retry of automatic workflow remains available after failure, not required for ordinary releases.
6. Document one-time credentials, native qualification, migration, protected-main configuration and production environment setup. Required environment reviewers imply a per-deploy pause, so recommend main branch protection as approval boundary and environment branch restriction without per-deploy reviewers for the user's requested automatic steady state; document optional extra reviewers as deliberately manual. Existing readiness gates remain blocked until verified setup. PR must accurately say prepared automation, not deployed/operational.

## Acceptance bar

- Merging a deployable change to main starts full CI and needed remote operations without workflow dispatch, after one-time readiness/account setup; PR checks cannot deploy.
- Backend deployment precedes mobile operations from the same immutable SHA; no subsequent operation after failure.
- Docs-only no-op; backend-only no native builds; combined changes both; cumulative checkpoint handles replaced pending runs, deletions, renames, failures and identical manual retry.
- Only validated successful same-workflow main runs can checkpoint; bootstrap explicit, history and metadata fail closed.
- Native/store secrets never in PR/reusableCI, one queue for automatic work, legacy queue cannot replace it; no automatic Git writes or protected-branch changes.
- Existing exact artifact/status/project/source/profile checks and awaited submission preserved. TestFlight/internal upload does not claim public release.
- Current local deterministic bar remains green; new planner/orchestration regressions meaningful; cross-family grade passes. PR opened against main with clear validation and actual remaining account/device/live blockers, no merge.

## Read first for independent scope/bounce

All paths relative to /Users/cortega/Documents/Projects/personal/FlexBreak/.worktrees/flexbreak-audit-release:
.github/workflows/{ci,release,deploy-backend}.yml; scripts/{release,deploy-backend,release-readiness}.mjs; docs/{CI_CD_SETUP_GUIDE,BACKEND_DEPLOYMENT}.md; tests/{release,backend-deploy}.test.mjs.

## Additional verified repository facts

GitHub owner is crisnc100. No open PR exists. GitHub environments API returned an empty list; main branch protection API returned404 Branch not protected. These are one-time configuration gaps for the automatic merge boundary. The old repository already used production.yml, so the new automatic pipeline uses a unique auto-production.yml path and rejects pre-bootstrap checkpoint history instead of accepting historical placeholder-pipeline success.

## Accepted bounce corrections

- Use unique auto-production.yml and require checkpoints at/after bootstrap.
- Reject run attempts above1. Recovery uses a fresh workflow dispatch at current main, not Actions Re-run.
- Select the newest successful valid workflow checkpoint and reject nonancestor history; never search backward for a convenient ancestor. Additionally re-read current main immediately before remote side effects and reject a stale event SHA: a newer partially failed run may already have deployed backend state even without a success checkpoint.
- Preflight every selected backend/mobile credential-presence, CLI version, destination and readiness gate before the first remote mutation. Mobile token remains scoped to its mobile step; presence flags are sufficient earlier.
- Production job executes even for no-op, records none and advances only after cumulative planning completes successfully.
- Unknown paths classify conservatively as both; neither is an explicit allowlist. Do not blanket-ignore .github because CI/automation changes are deploy-sensitive. Diff with no rename detection so both deleted and added paths are considered.
- Default remains TestFlight/Play internal after the optional preference question's response window. No public-release behavior is authorized without a later answer.
- Advisor's extra confirmation questions are already resolved by user intent: no per-deploy environment reviewer in the automatic steady state; merge is approval. A failed/partial run may rebuild/reupload a previously successful iOS artifact on retry with a fresh build number; disclose this instead of adding a resume/checkpoint subsystem.
- Initial v2 deployment must have an explicit one-time engineering bootstrap procedure because native qualification depends on it and the combined automatic pipeline correctly preflights all gates. Use reviewed source, named fixed-project CLI commands and configured owner credentials; no permanent readiness bypass.

## Final PR-preparation repository controls

Configured/read back GitHub main protection: PR required, strict quality/backend/firestore-rules checks bound to GitHub Actions app15368, enforcement includes admins, no force pushes/deletion. Production environment main-branch-only with no deployment reviewers; ASC_APP_ID6743581671 set. No cloud/backend/native/store operation was run. Bootstrap self-ancestry command returned0. Recovery union and privacy draft/gate final Fable re-grade passed without blockers.
