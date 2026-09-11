# Automatic TestFlight, manual gated production

Cris approved making TestFlight the normal automatic deployment path while leaving unfinished production manual-only. PR9 is merged at abf975c; this is a fresh branch/PR in the existing worktree.

Scope: move the main push trigger from auto-production.yml to iphone-testflight.yml; retain manual dispatch on both. Rename production's display name to Production deployment (manual). Accept push and workflow_dispatch in the TestFlight helper, retaining current-main, first-attempt, repository, token, metadata, config restoration and exact-artifact guards. Production helper/checkpoint logic and readiness records remain unchanged. Update active operator docs, not historical reports.

Bar:
1. Main pushes trigger exactly the TestFlight release workflow and its full reusable CI; production has dispatch only. All main pushes, including docs-only, can consume a native build number; no path filtering or new planner.
2. Push and fresh dispatch both exercise the existing exact build+submit orchestration. Untrusted events, wrong branches/repositories, retries and stale main remain rejected.
3. Production retains the same filename/history, full preflight and readiness checks; TestFlight success cannot advance its checkpoints. It runs only when explicitly dispatched, and may still fail qualification then. No auto backend deployment or App Review.
4. Relevant tests assert new trigger semantics plus unchanged safety behavior; existing full tests, lint/typecheck and independent review pass. No weakened check; assertions expecting dispatch-only TestFlight change with the authorized policy, with explicit push orchestration coverage added.
5. Active docs explain auto TestFlight, manual retry, manual gated production and re-enablement as a future reviewed change. Commit and open a NEW PR, never merge.

Bounce resolutions: retained equal shared concurrency and documented pending-run replacement/manual retry; tests pin exact push/main and dispatch-only production triggers and exercise push orchestration; all six active operator/project docs updated. GitHub production environment readback has branch policy only, no required reviewers. Skip-CI markers and per-main-push build consumption documented.
