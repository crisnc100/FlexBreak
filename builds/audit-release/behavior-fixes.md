# Behavior fixes and verification

## Changes and decisions

### Reminder delivery

`src/services/reminderService.ts` now uses OS repeating weekly local notifications with no remote token, authentication or Firestore write dependency. Disable cancels only scheduled/premium reminder types and works offline. Selected weekdays/time are preserved; premium level-3 reminders add two hours with next-day rollover. Scheduling/cancellation failures are reported, partial schedules roll back, and AI/weather notifications remain intact. The initial hybrid remote/local repair was superseded after recovering and reviewing the live sender; remote-disable acknowledgments are no longer part of the new client contract.

### Monthly Flex Saves and calendar charts

`streakManager.ts` no longer refills an exhausted month on initialization. Both its direct refill API and `flexSaveManager.ts` monthly refill use recorded dates to cap the remaining monthly allowance; a missing lastRefill timestamp cannot override two saves already used this month. Existing accessibility checks remain. The latter module's `refillMonthlyFlexSaves` export is the shared premium/startup refresh entry point.

`progressTracker.ts` weekly activity uses calendar-day distance across DST. Active days parses local date components instead of interpreting YYYY-MM-DD as UTC. The 30-day window remains inclusive of today and the previous 29 days.

### Durable routine completion

`gameEngine.ts`, `storageService.ts`, progress `types.ts`, and optional `ProgressEntry.id` implement explicit completion receipts in the existing `@user_progress` JSON value. The module-level completion queue serializes duplicate/new completions; no global transaction mode is introduced.

1. Optional stable id identifies new callers; existing callers keep their exact timestamp identity. Different ids at the same timestamp receive distinct daily ordering; history keys/date consumers are unchanged.
2. Before either history write, persist a pending receipt containing the routine and its frozen XP/boost/welcome breakdown. This is intent, not an award.
3. Independently repair `@progress` (20 recent entries) and `progress` (all history), adding each identity at most once. Both keys must succeed before any XP/statistics award. Strict completion reads throw rather than treating read/corrupt data failure as an empty account/history.
4. Commit base XP, welcome flag, statistics and phase=base in one `@user_progress` write. Retrying a persisted base receipt skips those awards.
5. Run replay-safe streak/challenge/achievement/reward finalization. Collaborator saves retain phase=base plus their own completed/unlocked flags, so partial persistence cannot double an achievement or reward. A final write stores the compact complete marker. Failed final writes remain recoverable; ambiguous storage writes (stored then rejected) are explicitly tested.
6. Completed retries return no new XP breakdown/challenge notifications. Achievement notifications are deferred until final persistence via optional `updateAchievements(..., false)` and `emitAchievementCompletions`; unsuccessful writes do not announce an uncommitted reward.
7. `recoverPendingCompletions()` is exported from gameEngine/index for startup reconciliation. It runs before loadGamificationData reads progress. New completions attempt older pending receipts; an older failure is logged and retained for retry without blocking the new receipt. Startup isolates recovery failure so saved summary data still loads.

Legacy history without a receipt is treated as already completed, avoiding retroactive awards or unhiding records. This does not attempt to infer whether a pre-upgrade partial write had received rewards; no historical migration policy is invented. Completed receipts retain only a small phase marker; full routine payloads remain only while recovery is pending.

First/second daily XP, third-and-later cap, duration amounts, 50-XP welcome, boost amount, level thresholds, challenge claiming/expiry and historical storage keys are preserved by actual-source tests.

### Lint and typing

Owned progress lint errors fixed by scoping lexical declarations inside switch cases, using const for un-reassigned bindings, replacing the constant loop condition with its existing membership invariant, and statically importing LEVELS. No lint rule/test/check disabled. ExportProgressData failure now logs; native no-op branch documented. The entitlement-only restoreTestingAccess follow-up is also resolved.

## Tests

Historical initial behavior pass: `node --test tests/behavior*.test.mjs tests/core*.test.mjs` passed 33 tests after adding the final two integration cases (rerun recorded in session). Suites execute actual application TypeScript with explicit native/network stubs in isolated VM contexts. New behavior suites:

- `tests/behavior-reminders.test.mjs`: real service+scheduler+notification classifier; local-only offline disable, repeating weekday/time triggers, premium next-day rollover, AI/weather isolation, cancellation failure and partial-schedule rollback.
- `tests/behavior-calendar.test.mjs`: spring/fall DST, inclusive/exclusive 30-day bounds, monthly exhaustion, missing refill metadata, next-month allowance.
- `tests/behavior-completion.test.mjs`: both history failures, all receipt-phase failures with/without ambiguous persisted writes, module restart recovery, finalization failure, boost/welcome preservation, concurrent replay, same timestamp/distinct identities, strict read errors, hidden legacy history, real achievement notification/XP retry, real reward-manager intermediate save, real challenge finalization.

Original core assertions are unchanged. Core-progress mocks now provide getAllRoutines and rewardManager's return value; helper accepts explicitly provided deterministic globals for achievement timer tests.

Baseline reminder/FlexSave/DST defects were reproduced against actual source in behavior-audit.md. Original completion implementation unconditionally increments history/statistics and ignores failed writes; new failure cases exercise the previously missing invariants rather than duplicating source formulas.

Current full `npm run type-check` passes with zero diagnostics; earlier SDK57/backend integration errors are resolved. Owned lint errors were repaired without suppressing rules.

## Core Grade follow-up

F1: failed older receipts remain persisted and retryable while later completions proceed; startup recovery failures do not hide the saved gamification summary. Frozen XP, receipt phases and historical keys remain unchanged. F5: final receipt persistence merges the best streak saved by the streak collaborator, preventing a stale in-memory overwrite. New actual-source regressions cover both cases. F2–F4 (verification, discount SKU state and spinner cleanup) are documented in entitlement-fixes.md.

Post-Grade focused app tests: **53/53 passed**, then full typecheck passed. The seat subsequently verified **128/128 full app tests**, **42/42 backend tests**, and **0 Deno audit findings**. Final both-platform Hermes export passed with one worker; device behavior remains a separate qualification gate.

## Limits

Physical device notification delivery/background scheduling and complete user interaction flow remain device validation. Local reminders repeat through the OS; delivery still requires physical-device acceptance. Legacy sender retirement is a separate reviewed cloud operation. Receipt serialization covers routine completions; preexisting unrelated concurrent progress writers are not converted to a new global transaction system. Cross-family review is required before treating the repaired behavior as release-ready.


## Follow-up after recovered live source

New builds now use OS repeating weekly notifications instead of one-shot reminders and have no remote push-token/write dependency. Selected weekday/time stays the same; premium level3 +2h reminder rolls over to the following day when needed. Six reminder regressions verify filtering, offline disable, OS failure, repeat trigger components and partial rollback. App startup streak validation now executes before notification setup; an async return previously bypassed it on notification-enabled installs. Motivational notification cleanup no longer cancels premium reminder notifications. Legacy clients still need the phase0 write bridge until adoption; live Firebase sender retirement is a separate reviewable operation.
