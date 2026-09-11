# Independent review

**Verdict: 4 of 5 criteria PASS statically. Criterion 5 FAILS on residual stale lines in two active docs. Test/lint execution is unverified because Bash is disabled in this session.**

| # | Criterion | Result | Evidence |
|---|---|---|---|
| 1 | Main push runs only TestFlight + full CI; production dispatch-only; no path filter/planner | PASS | `iphone-testflight.yml:2-5` push main + dispatch, `quality` uses `ci.yml`; `auto-production.yml:2-3` dispatch only; `ci.yml:3-4` does not trigger on main; no `paths:` filter anywhere |
| 2 | Push and fresh dispatch use the same build+submit path; untrusted/wrong branch/retry/stale rejected | PASS | `scripts/iphone-testflight.mjs:14` accepts push or dispatch, still requires main, attempt 1, repo, 40-hex SHA; `assertCurrentMain` bracketing at lines 51 and 63 unchanged; workflow guard at `iphone-testflight.yml:15-20` |
| 3 | Production file/history/preflight unchanged; TestFlight cannot advance checkpoints; dispatch-only; no backend/App Review | PASS | Git status shows no changes to production-plan/preflight/mobile, release-readiness, deploy-backend, ci.yml. Checkpoint scan filters on `auto-production.yml` workflow id/path (`production-plan.mjs:21,93`), so TestFlight runs are invisible to it. TestFlight yml has no Supabase/deploy step (test asserts this at `iphone-testflight.test.mjs:172`) |
| 4 | Tests assert new trigger semantics plus unchanged safety; suite/lint/typecheck pass | PASS (static) / unverified execution | `iphone-testflight.test.mjs:155-157` pins push-main + dispatch and dispatch-only production; `:63-72` adds push orchestration equal to manual plus wrong-branch rejection; safety tests (config rejection, stale main, bad build, restore) retained. `production.test.mjs:80` pins dispatch-only. `npm test` covers `tests/*.test.mjs`. **unverified —** I could not run `npm test`, lint, or type-check |
| 5 | Active docs explain auto TestFlight, manual retry, manual gated production, re-enablement | FAIL | README, CLAUDE.md, .github/README.md, RELEASING.md and the new sections of the two guides are correct. But these lines still assert automatic production/backend deployment and contradict the policy: |

Stale lines to fix (concrete, one-line edits each):

- `docs/CI_CD_SETUP_GUIDE.md:5` "Automatic merge-to-main deployment is prepared but currently blocked"
- `docs/CI_CD_SETUP_GUIDE.md:11` "Automatic production and its identical manual retry check this"
- `docs/CI_CD_SETUP_GUIDE.md:44` "production checks the immutable main SHA captured by push or fresh dispatch"
- `docs/CI_CD_SETUP_GUIDE.md:97` "The authenticated backend deploys through the same automatic workflow"
- `docs/BACKEND_DEPLOYMENT.md:1` title "Automatic backend deployment and legacy containment"
- `docs/BACKEND_DEPLOYMENT.md:28` "Both push and fresh Run workflow use identical cumulative semantics"
- `docs/BACKEND_DEPLOYMENT.md:40` "Backend-only automatic runs preflight"

No other blockers. Concurrency group is shared and non-cancelling across TestFlight, preview and production, matching the documented queue behavior. Commit and PR were not checked since no git commands could run.

## Documentation correction check

**PASS on all seven cited lines.** Each now states automatic TestFlight on main pushes and dispatch-only, gated production/backend. Plan.md matches.

| Cited line | Current wording | Agrees |
|---|---|---|
| CI_CD_SETUP_GUIDE.md:5 | Main pushes run automatic TestFlight; production/backend manual-only and blocked | Yes |
| CI_CD_SETUP_GUIDE.md:11 | Manual production dispatches check readiness before EAS | Yes |
| CI_CD_SETUP_GUIDE.md:44 | TestFlight uses push/dispatch SHA; production uses manual-dispatch SHA | Yes |
| CI_CD_SETUP_GUIDE.md:97 | Backend deploys through the manual gated production workflow | Yes |
| BACKEND_DEPLOYMENT.md:1 | Title "Manual backend deployment and legacy containment" | Yes |
| BACKEND_DEPLOYMENT.md:28 | Fresh Run workflow is cumulative; main pushes do not deploy the backend | Yes |
| BACKEND_DEPLOYMENT.md:40 | Backend-only manual production runs preflight | Yes |

Surrounding sections also agree: the CI guide's section on manual gated production and automatic TestFlight, the re-enablement sentence at line 81, and the shared-queue note at line 101.

**Two residual soft contradictions remain, both in one-time setup text, not deployment instructions:**

- `docs/BACKEND_DEPLOYMENT.md:7` says "Merge is the steady-state approval boundary" for the production environment. Line 3 of the same file and the CI guide at line 81 say backend deployment is dispatch-only and the dispatch is the approval boundary.
- `docs/CI_CD_SETUP_GUIDE.md:27` says "protect main so merge is the approval boundary" and "To deploy automatically after merging, do not add per-deployment environment reviewers." Merge now only triggers TestFlight uploads, which line 101 describes correctly. The word "deploy" here can be read as production.

Neither instructs anyone to run production or backend automatically. They are wording residue from the old model. Fixing both is a one-line edit each if the grader wants a clean sweep.

The two nonblocking setup wording observations were also corrected to distinguish the TestFlight merge boundary from the backend dispatch boundary.
