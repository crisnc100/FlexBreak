# Automatic deployment scope and plan bounce

Verified read-only Fable5.1 response.

**SCOPE VERDICT: right-sized, with four grounded corrections before it is safe to build.** The checkpoint-from-last-success design is the minimal mechanism that satisfies "replaced pending run must not lose changes" without path filters, and the path classifier is justified because a docs-only merge must not consume two native builds. Nothing in the six points is redesign fodder. The corrections below are gaps in the checkpoint and preflight logic, not scope changes.

**ADVISORY**

1. **Filename collision breaks the explicit bootstrap.** Main still tracks an old push-triggered auto-release at `.github/workflows/production.yml`, which this branch deletes. GitHub keys workflow run history by path, so a recreated `production.yml` inherits every historical run of the old workflow. Any old successful run on main with event push passes every filter in point 2 including ancestry, and the reviewed bootstrap is silently bypassed. Fix both ways: use a filename that has never existed, and require the chosen checkpoint to equal or descend from the bootstrap SHA.

2. **Fail closed when the newest success is not an ancestor. Do not search for the newest ancestor.** If a "Re-run" of an old failed run for SHA X executes after a newer run for Y deployed backend Y and then failed at mobile, a newest-ancestor search plans Z..X and deploys backend X over Y. That is an accidental rollback. Read the run attempt variable and reject any attempt above one with the message "retry with Run workflow, never Re-run." With that rule, push and dispatch are the only paths, both plan from head, and the newest-success ancestry check is sufficient. Exclude the current run by run id, which also correctly handles re-runs of successful runs if you ever relax the rule.

3. **Preflight every blocker before the first remote side effect.** Point 4 says fail on any operation and document partial success, but with readiness records blocked and no store credentials yet, every mobile-classified run would deploy v2 backend and then die at readiness, on every subsequent push, because the checkpoint never advances. The existing release helper already validates before contacting EAS. Hoist it: when the plan includes mobile, run both platform readiness checks, token presence, ASC variables and CLI versions before the backend deploy step. Token presence can be checked without exposing the value using a step env expression comparing the secret to empty string, which keeps the scoping in point 4 intact.

4. **Never skip the production job by an `if:`.** A run whose deploy job is skipped still concludes success and would advance the checkpoint. Always run the job. The planner decides internally and writes "planned: none" to the summary for a no-op. Also treat checkpoint equal to event SHA as an explicit no-op.

5. **Classifier defaults.** Unknown paths must classify as backend plus mobile, never neither. The neither allowlist should be explicit: docs, builds, tests, security-tests, firestore rules and indexes, the emulator config, `.github`, markdown, editor files. Postinstall and signing scripts under `scripts/` affect native builds and belong to mobile. Legacy function directories under `supabase/functions` classify as backend, which only redeploys v2. State in the doc that legacy source changes never auto-deploy. Use no-rename diffing so a rename surfaces as delete plus add and both paths are classified.

6. **Workflow capabilities confirmed.** Workflow-level concurrency with cancel disabled gives one running plus one pending run and replaces the older pending run with conclusion cancelled, so it never checkpoints. Dispatch on main resolves to branch head, so retry and push have identical semantics. The runs API filters one event per query, so run two queries or filter client-side. The token needs `actions: read` on the production job only; the reusable CI keeps contents-only because called jobs cannot exceed caller permissions and the caller default stays read. Ancestry needs full-depth checkout. Make checkpoint selection a pure function over run JSON, current run id, event SHA, bootstrap and an injected ancestry predicate so the rejection cases are unit-testable.

7. **Script gating.** Both helpers currently reject anything but workflow_dispatch. Allow push plus dispatch for v2 and mobile, keep legacy-containment dispatch-only, and test each. Distinct legacy concurrency group is correct: disjoint function names make parallel API deploys safe.

8. **Acceptance bar additions.** Add: re-run attempts fail closed; a checkpoint older than bootstrap fails closed; a mobile-classified run with blocked readiness performs no backend deploy. Keep the rest.

**QUESTIONS**

1. **Confirm no environment reviewers.** Plan point 6 means a merge is a live v2 backend deploy and TestFlight upload with no second click after one-time setup. Recommended: yes, main protection is the approval boundary, as the plan states.

2. **Accept duplicate TestFlight builds on retry.** Because there is no partial scope, a retry after an Android failure rebuilds and resubmits iOS with a new build number. Recommended: accept and document it.
