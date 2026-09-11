**Verdict: PASS with three required corrections.** No unsafe omission in the swap itself. The current-main check already accepts push events, so widening the helper's event check keeps every remaining guard intact, and the production planner reads only auto-production.yml run history, so TestFlight runs cannot advance checkpoints.

Required corrections to the plan:

1. **Shared concurrency group cancels pending runs.** Both workflows use the same group with cancel-in-progress false. GitHub keeps at most one pending run per group, so a main push cancels a pending manual production dispatch, and a production dispatch cancels a pending TestFlight push run. Keep the shared group. It prevents concurrent EAS build-number increments and uploads. The plan must state it, docs must tell Cris to check for pending runs before dispatching production and to re-dispatch if cancelled, and the existing equal-concurrency test must survive. Cancelled runs stay in history, so checkpoint contiguity is not broken.

2. **Name the exact test changes.** Bar 4 is too general. Required assertions: TestFlight workflow keys equal push plus dispatch, push branches equal exactly main, no paths or tags filter. Production workflow keys equal exactly dispatch only. Replace the push rejection case in the TestFlight configuration test with a non-main-branch push or another event type, and add a push run asserting the same build-then-submit event sequence as dispatch.

3. **Name the docs that go stale.** These four active files all describe production running on every main push and backend auto-deploying: the workflows README under .github, RELEASING.md, BACKEND_DEPLOYMENT.md, and CI_CD_SETUP_GUIDE.md. Docs must say plainly that backend deployment is now dispatch-only.

Minor, not blocking:

- The helper error text, stage label and the workflow step name all say fresh dispatch. Reword so a failed push retry is not misdirected.
- unverified: if the production environment has required reviewers, push runs will wait for approval and TestFlight is not automatic. Confirm in repository settings and state the expectation in docs.
- Commits with a skip-ci marker will not trigger the push run for that sha. The next push covers it. One line in docs is enough.
