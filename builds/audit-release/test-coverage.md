# Regression coverage and validation

## Current validation

The seat verified **128/128 full app tests**, **42/42 backend tests**, and **zero Deno dependency-audit findings**. Full TypeScript checking passes. After repairing core Grade F1–F5, the focused completion/core-progress/entitlement/native-billing selection passed **53/53**, followed by a sequential passing typecheck. Final both-platform Hermes export passed with a single worker. See AUDIT_REPORT.md for the consolidated final evidence and release limits.

Coverage now includes partial-write completion receipts and retry recovery; isolation of a failing older receipt and persisted best streak; DST/calendar and monthly FlexSave limits; local-only repeating reminders and rollback; entitlement migration/expiry and failed persistence; malformed store responses, verified current-SKU upgrades and background renewal persistence; actual modal office/student selection and failed-purchase spinner cleanup; local AI export/deletion races; and native media/billing adapters. See behavior-fixes.md, entitlement-fixes.md and privacy-fixes.md for the concrete contracts and limits. Native/network boundaries use explicit mocks; these tests do not establish physical-device delivery, payment-sheet behavior, or provider availability.

## Historical initial nine-test core bar

Run `node --test tests/core*.test.mjs` with Node 22 and installed dev dependencies. These nine tests execute production TypeScript transpiled in memory by a small Node `vm` loader. They do not copy production algorithms. Expected totals and fixtures are independently specified. External/native imports fail closed unless mocked; storage uses per-test cloned memory, and time is fixed. No real app data or remote services are accessed.

Covered:

- `initSoundSystem`: the initial SDK52 audio setup used the named expo-av interruption enums (superseded by SDK57 native adapters), initializes once, and restores the saved disabled preference. Audio resources/native playback are mocked.

- `useGameActions`: Posture Patrol callback initialization succeeds with real lexical declarations and mocked React/native APIs; protects the repaired use-before-initialization crash. Does not simulate a React render or execute game callbacks.

- `gameEngine.processCompletedRoutine`: first/second daily duration XP, third daily base-XP cap, next-day restart, welcome awarded once, persisted routine/minute counts; active boost doubles base XP without doubling welcome.
- `levelManager`: representative exact level thresholds and halfway progress.
- `xpBoostManager`: locked/exhausted activation denial, one-use consumption, 36-hour activation and active multiplier.
- `challengeManager` with real `levelManager` and `xpBoostManager`: claim once, no challenge regeneration on claim, expired reward halved before boost.
- `generateRoutine`: controlled catalog verifies free/premium eligibility, demo availability, area and position filtering, positive durations, time budget and removal of trailing transitions.

Limits: This is a small behavioral regression bar, not comprehensive coverage or device verification. Completion collaborators for achievements, streaks, rewards and challenge updates are mocked; challenge-claim tests execute the actual claim path separately. Catalog fixtures exercise generator selection logic rather than loading bundled media assets. TypeScript transpilation does not replace `tsc --noEmit`. No coverage percentage is claimed.

Deferred at the initial nine-test checkpoint (historical, several are now covered above): audited reminder cancellation/offline scheduling defects; exhausted monthly Flex Saves; DST/chart and inclusive date-window defects; failed/partial storage and duplicate completion identity; challenge category reset cycles; actual premium purchase/unlock lifecycle; sparse/empty generator catalogs, custom routine generation and bilateral timing; timer React lifecycle/pause/skip behavior; AI access/usage failures; notification delivery, audio/video, purchases/restore, restart persistence and Siri on-device checks. Known defects are documented in `behavior-audit.md`; none were encoded as passing bug expectations, skipped tests or TODO tests. This initial suite did not change application behavior; later authorized repairs and expanded regressions are recorded in the current validation section.
