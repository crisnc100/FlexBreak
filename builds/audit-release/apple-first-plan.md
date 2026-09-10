# Apple-first release scope

The owner explicitly deferred Google Play on September 10, 2026. Preserve the app's Android implementation and tests, but automatic production must build/upload iOS only. No Google Play account creation, permission grants, API enablement, or Android upload belongs to this phase.

## Implementation boundaries

- Use one checked-in fixed release-platform policy shared by production preflight and mobile execution. No environment/workflow input may silently expand the selected platforms.
- Require shared service/privacy evidence and platform-specific purchase/account/native evidence for the selected platform. Google-specific evidence must remain blocked for future Android release, without blocking iOS. Do not mark any readiness record ready just because credentials were installed.
- Keep cumulative deployment planning, stale-main checks, exact artifact validation, backend-first ordering, fresh-dispatch retries, failure propagation, and all CI jobs intact.
- Preserve generic Android artifact validation, submission configuration, signing safeguards, and existing Android/core tests. Adapt only assertions that encode the superseded two-platform automatic-release requirement; retain their safety coverage and add explicit scope-isolation checks.
- Update operational docs to distinguish Apple-only automatic deployment from deferred Android setup. Existing Firebase configuration correction remains part of open PR #6; use the current branch/worktree.

## Acceptance bar

1. Automatic execution invokes only iOS; neither environment variables nor Android readiness can enable an Android upload.
2. Combined preflight checks all iOS/shared prerequisites before any backend deployment; missing iOS credentials, evidence, or privacy disclosure still blocks it.
3. Missing Google credentials/Android evidence does not block an otherwise qualified iOS release; Android cannot reuse iOS purchase/account evidence.
4. Existing source/checkpoint recovery and Android validation coverage still pass, and CI still checks both JavaScript bundles and all backend/rules tests.
5. Docs describe the current scope and remaining real blockers accurately. No cloud build/upload/deployment or readiness promotion occurs as part of this code change.

Validation: focused production/release/native-signing tests, full `npm test`, targeted lint, followed by read-only cross-family review. GitHub CI verifies the final PR revision. Keep local heavy work sequential.
