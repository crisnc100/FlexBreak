# FlexBreak audit and release repair
## Outcome
Evidence-backed audit and reviewable fixes that preserve core features and provide an honest release path.
## Steps
1. Baseline dependency install, typecheck, lint/test inventory, native/EAS configuration, core behavior map, security and redundancy analysis.
2. Independent cross-family scope/bounce; incorporate verified gaps.
3. Implement narrow fixes and replace duplicate CI/release orchestration; verify chosen source, destination, exact artifact, result, least privilege and version ownership.
4. Add useful regression tests for changed security/release behavior and existing core invariants; report all existing failures without skipping or weakening checks.
5. Run deterministic checks, independent cross-family grade, fix confirmed failures, deliver audit, runbook, remaining external blockers.
## Acceptance bar
- Audit documents coverage, severity, source/command evidence, reachable risk, disposition and remaining unknowns, including security, redundancy and tests.
- Core algorithm/storage/purchase intent preserved. Any changes get focused regression evidence; uncertain cleanup is reported only.
- npm install is reproducible from lockfile. lint/test execute actual checks; full typecheck remains enforced without baseline exclusions or suppressions to fake success.
- CI does not expose release secrets to PR checks; one release entry point, no automated source commits/pushes, trusted source and serialized releases.
- Release verifies actual destinations, waits for build and submission results, submits exact artifact, and never labels TestFlight upload as public release.
- App store/native compatibility and credential gaps are explicit; failed preconditions block release. No production changes during audit.
- Documentation names exact local/CI commands, secret/variable names, one-time credential setup, test-device checklist and rollback limitations.
- Deterministic checks and independent grade recorded with PASS/FAIL/UNVERIFIED accurately. No tests removed/weakened to pass.

## Expanded implementation phases
6. Fix reported reminders, calendar/FlexSave accounting, idempotent completion, AI deletion/privacy and entitlement trust with regressions. Preserve product rules rather than current accidental bugs.
7. Recover backend source/ownership; add verified caller identity and server-side atomic grants/receipts plus owner-scoped rules with staged live compatibility. No unaudited immediate deny-all rollout.
8. Migrate supported native dependencies and billing, eliminate actionable dependency advisories and all lint failures without weakening checks. Confirm production build and device/store preconditions.
9. Independent grade against expanded bar, staged release plan and concrete external changes reviewed only after local work complete.
