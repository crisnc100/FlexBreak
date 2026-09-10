# ESLint cleanup

Owned scope: App.tsx and originally failing src files, excluding reminderService, storageService and src/utils/progress. Native migration files were yielded to release_pipeline after narrow initial lint edits; no subsequent edits to those files. No ESLint rules, ignores, tests, package scripts or suppression directives were changed to make checks pass.

## Behavior-relevant repairs

- LevelUpNotification registers hooks on every render. Unsupported sources dismiss through an effect-owned 100ms timer and return null after hooks; supported sources keep the original mounting/animation delays. Mounting and dismissal timers are cancelled on effect cleanup.
- StatsOverview calls useStreak unconditionally. The hook already handles asynchronous load errors internally, retaining the last streak; wrapping a hook in try/catch violated hook ordering without protecting those asynchronous calls.
- BobSimulatorScreen uses one typed Date Proxy helper for both simulation paths. Zero-argument construction and Date.now use the simulated timestamp; explicit constructor arguments and static methods remain supported. This removes class/DateConstructor mismatch and arguments spreading suppressions without weakening types or mutating the original Date.now.
- Rewarded-ad event imports resolve before constructing the event-driven Promise. Import failures propagate through the enclosing async function instead of an async Promise executor leaving the caller pending.
- Haptics calls use the installed Expo enum values directly; these match the former string fallbacks. Existing platform/function availability guards remain.
- Navigation IDs and Ionicons names are typed explicitly; routine screen's legacy numeric xp compatibility checks now narrow an unknown property before arithmetic.

## Mechanical cleanup

Escaped JSX apostrophes/quotes preserve displayed text. Switch cases with lexical declarations have local blocks. Unmodified variables use const. Memo/forwardRef components have display names. Callback types replace Function. Stale ts-ignore directives were removed, redundant escapes and empty else branches removed, cleanup catches report their errors, and imports replace module requires (async imports remain deferred where used in async handlers). PNG asset imports have a numeric resource declaration for Metro. Original file line endings were retained, including mixed-ending legacy files.

## Validation

- Explicit originally failing owned-file list: ESLint exit 0, **0 errors**, 504 pre-existing warning-level findings (unused variables, any, hook dependency warnings). Warnings were not disabled or promoted into false passes; eliminating them was outside the assigned error-only cleanup.
- Full `tsc --noEmit`: exit 0 after cleanup, before the concurrent Expo/native dependency migration completes. Native owner must rerun against its final dependency graph.
- Executed actual extracted/transpiled production Date helper with assertions: simulated construction/now, explicit ISO date, seven-argument construction, preserved UTC/parse methods, instanceof Date, unchanged original Date.now all PASS. No app storage or remote calls.
- Whole App/src lint snapshot still had errors only in excluded storageService and progress modules; diagnostics handed to typecheck_fixes. Plugins and root testWeatherAPI.js were outside owned scope and handed to seat/native owner.

Device animation behavior, ad SDK event delivery and simulator UI were not exercised. The cleanup does not claim end-to-end mobile validation.
