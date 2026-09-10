# Automatic deployment and final toggle grade

Read-only Fable5.1 grade, verified model and no API error.

**Overall: PASS on all five automation bars and the toggle follow-up. No blocking or High defects. Three Low items and two doc nits, none of which change the verdict.** I ran no shell, so test counts stay as reported; every claim below is from files read this session.

## Findings, severity ordered

- **Low, checkpoint strictness before the first success.** `scripts/production-plan.mjs:32-34` requires run numbers 1..max to be contiguous whenever no success exists yet. The bootstrap diff is already complete regardless of missing runs, so this check adds no safety there. One manually deleted run before the first success blocks every run until the bootstrap constant is changed in a reviewed edit. Recovery is documented at `docs/CI_CD_SETUP_GUIDE.md:76`. With a real success checkpoint the window correctly starts at that run, so the bar's "deleted ancient history" case passes.
- **Low, classifier precedence.** `.github/` is tested before the markdown rule at `scripts/production-plan.mjs:45-46`, so an edit to `.github/README.md` or an issue template deploys all six v2 functions and both native builds. Conservative direction, but it spends two native builds on prose.
- **Low, undeclared test dependency.** `tests/production.test.mjs:76` imports js-yaml, which is not in package.json. It resolves through the lockfile-pinned transitive copy (package-lock.json:11686, version 4.3.2), so `npm ci` reproduces it. Fragile if eslint's tree changes.
- **Nit, docs.** `.github/README.md:3` says "changed v2 backend functions"; the code redeploys all six on any backend path. `docs/CI_CD_SETUP_GUIDE.md:37` lists `tests/release*.test.mjs`, which misses the production and backend-deploy tests that `npm test` runs.
- **Nit, cosmetic.** The toggle body inside runAIUIWork is not re-indented (`AIWellnessToggle.tsx:111-175`).

Unverified in this session: that no `auto-production.yml` ever existed on main, and that the runs API lists newest-created first. Both are stated in the plan and are what the pagination stop condition relies on.

## Bar grades

**1. Trigger semantics: PASS.** Push to main and dispatch only (`auto-production.yml:2-5`); standalone CI excludes main (`ci.yml:3-6`), so main CI runs once through workflow_call. PR checks have no secrets, no environment, contents read only. Unique path enforced against every run record and the workflow lookup (`production-plan.mjs:7,21,78-79`). Attempt above one rejected at `:13` and a rerun success cannot checkpoint at `:35`. Dispatch resolves to head and passes the same tip check at `:14`.

**2. Cumulative checkpoint: PASS.** Newest successful main push or dispatch, excluding the current run id, with repo, head repo, path, workflow id, SHA, and uniqueness validated (`:21-29`). Bootstrap ancestry and checkpoint-to-head ancestry both required at `:37`, no backward ancestor search. Pagination stops only once a success is found or the total is reached, and a mid-pagination insertion produces a duplicate id that fails closed (`:83-91`, `:21`). Tip is rechecked before each function deploy and before each EAS build and submit (`deploy-backend.mjs:61`, `release.mjs:55`). No-op runs still complete planning because the job has no `if` (test at `production.test.mjs:79`).

**3. Classification and queues: PASS.** No-rename diff at `:99`; unknown paths fall through to both at `:50`; release and deploy tooling under scripts classifies as both at `:49`. Docs, tests, rules, emulator config are the explicit neither list at `:46`. Distinct concurrency groups with cancel disabled (`auto-production.yml:8-10`, `deploy-backend.yml:6-8`), asserted at `production.test.mjs:91`.

**4. Preflight and scoping: PASS.** Preflight runs before backend and mobile with only presence booleans (`auto-production.yml:43-51`). It validates token presence, manifest, CLI version, EAS profile and version, both platforms' inputs, and both readiness records before returning (`production-preflight.mjs:9-23`). Backend step holds only the Supabase token; mobile step only the Expo token; reusable CI passes no secrets. iOS then Android with stop on failure (`:24-27`, `production-mobile.mjs:3-6`). Exact-artifact, project, source, profile and awaited-submission checks unchanged in `release.mjs:28-42,73-82`. Legacy is dispatch-only at `deploy-backend.mjs:20`.

**5. Docs: PASS.** Engineering bootstrap and its dependency for native qualification at `BACKEND_DEPLOYMENT.md:10-24`. Branch protection, no steady-state reviewers at `CI_CD_SETUP_GUIDE.md:23` and `BACKEND_DEPLOYMENT.md:7`. Fresh retry, rerun rejection, duplicate iOS upload at `CI_CD_SETUP_GUIDE.md:80`. Partial deployment at `BACKEND_DEPLOYMENT.md:30`. TestFlight and Play internal versus public at `CI_CD_SETUP_GUIDE.md:72,84`. No public release path exists in code.

## Toggle follow-up: PASS

The whole toggle now runs inside runAIUIWork (`AIWellnessToggle.tsx:111`), so its writes are registered in the active set before the drain at `aiDataLifecycle.ts:27-29,42`. An active deletion rejects entry at `:25`, and every post-await continuation is generation-guarded (`:120,125,142,145,156,160`), so the enabled flag, counters and scheduling cannot land after removal. All three keys start with `@ai_` and are covered by the removal filter (`localAIData.ts:5`). Deletion errors rethrow while real errors restore the prior state (`:168-171`). Tests cover rejection during deletion, drain of both paused keys, ordinary scheduling with the one-second cooldown, and write failure (`privacy-settings.test.mjs:74-98`). The unused cancelSubscription in-flight observation stays a documented nonblocker.
