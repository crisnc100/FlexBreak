# Core behavior audit

Date: 2026-09-09. Scope: core routines, progress, reminders, AI core, and test utility review. Application code was not changed. This report is the only file owned by this audit.

## Evidence and limits

Read README.md, package.json, App.tsx, routine hooks and completion callers, storageService, progress engine/tracker/streak manager/date helpers, reminder service and schedulers, AI core/initializer, and manual testing utilities. Used repository-wide `rg` call-site and test inventory searches. Runtime proofs below executed actual source with `typescript.transpileModule` and Node `vm.runInNewContext`, with mocked external collaborators and fixed clocks. These proofs did not mutate app storage, invoke network services, or write generated code to disk.

No mobile app build or device interaction was performed by this audit. Notification OS delivery, remote Firebase behavior, purchases, audio/video, and end-to-end routine UI are unverified. Source-confirmed defects are distinguished from runtime reproductions and coverage risks below. Recommendations are proposed narrow changes, not authorization to alter behavior.

## Findings

### 1. High — disabling reminders does not cancel them

`src/services/reminderService.ts:21` gates Firestore persistence and `scheduleAdvancedReminders` behind `settings.enabled`. The disabled path only writes local preferences. `src/screens/HomeScreen.tsx:453-454` then announces that all scheduled notifications were cancelled.

Runtime proof: transpiled the actual reminderService module with AsyncStorage, Firebase, notification scheduler, and FCM token mocks recording calls. Calling `saveReminderSettings({enabled:false,time:'09:00',frequency:'daily',days:['mon'],message:'Stretch'})` returned true; observed exactly five local setting writes, zero scheduler calls, zero notification calls, zero Firestore writes. Existing OS notifications were represented by the absence of any cancellation call; actual OS delivery was not tested.

Narrow proposed fix: persist remote disabled state and cancel reminder notification types independently of enabled/token branches. Do not cancel AI/weather notification types.

### 2. High — missing Firebase token or Firebase failure leaves local reminders unscheduled

`src/services/reminderService.ts:25-27` returns success when the token is missing. The exception fallback at `:127-145` schedules an immediate setup notice only, despite its message claiming future reminders are set.

Runtime proof: same in-memory service harness, FCM token mock returning null. Enabled settings returned true with five local writes and zero scheduler/notification/Firestore calls. Exception fallback was source-reviewed, not separately runtime-executed.

Narrow proposed fix: schedule local reminders independently of remote persistence. A local fallback must create actual future reminders and honor selected days/time.

### 3. High — exhausted monthly Flex Saves refill on initialization

`src/utils/progress/modules/streakManager.ts:81-87` forces two uses whenever balance is zero and user level is at least six, after the preceding code correctly calculates the remaining monthly balance. Callers include `src/utils/progress/modules/streakValidator.ts:49,229` and `src/hooks/progress/useGamification.ts:577`.

Runtime proof: transpiled actual streakManager and date helpers into memory; fixed `Date` to September 9, 2026 in America/New_York; mocked persisted progress `{level:6,rewards:{flex_saves:{uses:0,appliedDates:['2026-09-03','2026-09-05']}}}`, routine storage empty, event emitter inert, streak computation stubbed. `initializeStreak()` persisted uses=2 via reason `streak_init_refill`. Two saves already consumed in the current month should leave zero.

Narrow proposed fix: remove the unconditional zero-balance refill and preserve legitimate calendar-month refill eligibility. Gamification behavior should not be changed as incidental release cleanup.

### 4. Medium — weekly chart shifts activity across spring DST

`src/utils/progress/modules/progressTracker.ts:92` floors local-midnight millisecond difference divided by 24 hours. Consumer: `src/hooks/progress/useProgressData.ts:149`.

Runtime proof: transpiled actual progressTracker and dateUtils into memory, `TZ=America/New_York`, fixed now to `2026-03-09T12:00:00-04:00`. `calculateWeeklyActivity([{date:'2026-03-08T12:00:00-04:00',area:'Neck',duration:'5'}])` returned `[0,0,0,0,0,0,1]`; expected `[0,0,0,0,0,1,0]`. Sunday's routine is plotted as Monday/today because elapsed local-midnight duration is 23 hours.

Narrow proposed fix: compare calendar-day ordinals using the date helper instead of flooring elapsed hours.

### 5. Medium — active-day count drops the oldest valid day west of UTC

`src/utils/progress/modules/progressTracker.ts:172` parses a local YYYY-MM-DD string as UTC, then sets local midnight. Consumer: `src/hooks/progress/useProgressData.ts:155`.

Runtime proof: same actual-source harness/fixed March 9 clock. `calculateActiveDays([{date:'2026-02-08T12:00:00-05:00',area:'Neck',duration:'5'}])` returned 0; expected 1 for the inclusive first date of the last 30 calendar days.

Narrow proposed fix: parse year/month/day as local components or compare calendar-date strings.

### 6. Medium — routine storage failure does not stop progress awards

Source proof: `src/utils/progress/gameEngine.ts:140` ignores the boolean from `saveRoutineProgress`; `:145-148` proceeds to update totals and award XP. `src/services/storageService.ts:431-440` can return false after partial or failed writes. No failure-injection runtime proof was performed.

Narrow proposed fix: surface storage failure and avoid subsequent awards. Define recovery for partially successful writes across recent/all-history keys before implementing retry behavior.

### 7. Coverage risk — completion is not idempotent

Source proof: `src/services/storageService.ts:422,431` appends unconditionally; `src/utils/progress/gameEngine.ts:183` increments totals and `:473-474` identifies daily ordering by timestamp equality. Reprocessing the same entry can duplicate history and awards. `src/screens/RoutineScreen.tsx:177-179` documents an earlier duplicate-save fix.

Unverified: no normal UI double-completion trigger was demonstrated. Treat this as a retry/reentrancy regression gap, not an observed user failure. Define completion identity before a scoped fix.

## Core invariants to preserve

- Completion flows RoutineScreen → useGamification.processRoutine → gameEngine.processCompletedRoutine → storageService. One completion should create one history entry and one award event.
- Recent visible routines and all-history statistics use separate keys. Hiding a routine removes it from dashboard visibility while preserving lifetime statistics.
- Routine XP depends on first/second completion in the device's local calendar day, duration, XP boost, and a one-time welcome bonus. Third and later daily routines receive zero base XP.
- Challenges update from completed routine history and are separately claimed. Claimed state, redemption/expiry behavior, category cycles, and XP boost interaction need preservation.
- Flex Saves bridge streak gaps, do not add completed routine days, and have monthly usage limits. Streak state spans tracker, manager, validator, and persisted rewards; broad consolidation risks changing behavior.
- Reminder changes must honor enabled state, selected days/time, and notification-type isolation. Remote availability should not falsely imply local scheduling succeeded.
- AI checks access/day limits/cost, builds context, returns local routine CTA or generated text, and records memory/usage. Routine assembly filters unavailable premium stretches.

## Confirmed redundant or unused code

Evidence method: repository-wide symbol searches plus reads of declarations and local references. Exported compatibility surfaces deserve deliberate removal review.

| Location | Evidence and scope |
| --- | --- |
| `src/utils/progress/gameEngine.ts:25` | `recentChallenges` is declaration-only in this module; active counterpart exists in challengeManager. |
| `src/utils/progress/gameEngine.ts:68-89` | `checkTimeSpecificRoutines` has no callers in this module; challengeManager owns the live implementation and calls. |
| `src/services/ai/core/aiWellnessService.ts:115,140` | `sanitizeClarifyResponse` and `enforceRoutineConciseness` are private methods with declaration-only references. |
| `src/hooks/routines/useRoutineTimer.ts:33` | `totalDuration` state is written but never read; totalDurationRef is the live duration source. |
| `src/hooks/routines/useRoutineTimer.ts:39` | animationRef starts null and is never assigned an animation; its stop branches are inert. |
| `src/hooks/routines/useRoutineStorage.ts:26-54` | Logging-only effect computes date arrays with no output or state effect. Similar unused date arrays at :92 and :117, plus unused date booleans in getRecentRoutines. |
| `src/utils/notifications.ts:434-744` | Legacy scheduleReminders/cancelReminders/scheduleRealReminder/setupBackgroundScheduling cluster has only internal references and no external app callers. Its cancel-all at :617 is dangerous but dormant. Other notifications.ts exports are live; do not remove the whole file. |
| `App.tsx:78,124,469` | introSoundPlayed, compatibility navigate, and pendingFlexChatOpen have no actual consumers. |
| `src/hooks/routines/useRoutineStorage.ts:185` | deleteRoutine compatibility method is only declared/returned; no consumer found. |

Do not infer every similarly named service is redundant: firebaseReminders intentionally re-exports the live reminderService and notificationScheduler APIs. The AI scheduler and general notification scheduler have different responsibilities.

## Test inventory and value

- `package.json:10,12-14`: lint/test/watch/coverage scripts are unconditional success placeholders. These are not quality checks.
- File inventory searches found no `.test`, `.spec`, `__tests__`, Jest/Vitest/Playwright setup, or describe/it/test declaration suite in the repository.
- `src/utils/testing/testMultilingualWellness.ts:60-66` prints AI passes without invoking/verifying AI. Language mismatches only log. Memory checks mutate test-user storage. Useful at most as a manual diagnostic example.
- `src/utils/testing/testWeatherNotifications.ts:86-90` defines expected results but never compares them; `:132` prints all tests passed unconditionally. Uses live location/weather data; not deterministic regression coverage.
- `src/utils/testing/aiWellnessTestUtils.ts` is a manual state manipulation/debug utility, not a test suite. No app import call sites for these testing modules were found.
- Do not replace these with tests that only assert constants or mirror implementation. Verify behavior and failure paths.

## Valuable regression checks

1. Reminder enabled→disabled cancels only reminders and persists remote disable. Missing token/network failure still produces scheduled local reminders on correct days/time.
2. Two monthly saves remain exhausted after initialization; a new month replenishes once.
3. Local calendar attribution, spring/fall DST, inclusive 30-day bounds, and hidden routines counted in statistics.
4. First/second daily routine XP, third routine zero base XP, welcome once, boosts, failed storage, and duplicate completion retries.
5. Claim once, expiry/reduced XP, category reset boundaries, and no challenge regeneration merely because an item was claimed.
6. Timer pause/resume preserves remaining duration; skip/completion moves once; unmount cancels timers.
7. AI free first-use/day restrictions and daily limits; failed initial request should not silently consume welcome access; local CTA filters premium-only stretches.
8. Device smoke checks for OS notification delivery and foreground/background tap handling, audio interruption, video timing, purchase/restore, and progress persistence after restart.

## Explicit candidates not promoted to confirmed user-facing defects

- Basic `calculateStreak` returns an old historical run as current (actual-source harness returned 2 for January 1–2, 2025 under March 9, 2026). However, useProgressData corrects display via streakValidator. Other caller impacts need tracing before changing behavior.
- Timer performs completion/scheduling effects inside a React state updater. Reentrancy/double invocation deserves a targeted lifecycle test, but no UI failure was reproduced here.
- AI first-used flag is written during access checking before completion; negative-feedback shortcut returns before normal trackUsage. Whether these conflict with intended product usage semantics requires a scoped behavior decision and failure tests.
- AI initialization is called in App and MainApp, with a singleton completed flag. Concurrent initialization and onboarding timing were not exercised on-device.

## Outcome

The audit found concrete reminder, monthly-save, and date-window defects, plus a missing automated regression bar. Preserve existing gamification behavior during release cleanup and scope these fixes separately. Source-backed unused private helpers and inert calculations are lower-risk cleanup candidates; no removal was performed by this audit.
