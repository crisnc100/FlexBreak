# Validation — September 10, 2026

- `npm test`:155 passed, zero failures/skips.
- `npm run type-check`:passed.
- `npm run lint`:zero errors,1148 warnings in existing codebase; warnings not suppressed.
- `npm run export:mobile`:iOS and Android exports passed.
- `git diff --check`:passed.
- Read-only Fable reviews: launch/media/catalog/account config, voice, and coach style pass on static inspection. Reviewer had no shell; test execution belongs to the seat. See adjacent grade documents.
- Initial Chinese footer test expected wording different from existing safety footer. Corrected expectation to existing text; production safety footer unchanged. Final full suite above includes corrected regression.
- Release fixes are committed in `4665a53`; buffering spinner fixes are committed in `7a9e63b`. Additional approved media-loading safeguards and handoff corrections are included in the follow-up commit. No new preview or production deployment. No published policy/App Store changes or readiness overrides.
- Device recording/transcription, first stretch loading, native splash, and live brevity remain unverified. Backend restart snapshot had no second attempt; do not claim persistence verified.

## Confirmed review fixes

Cris authorized both spinner findings from `reviews/2026-09-10-20-13-33/code-review.md`. Loading overlay is now outside the video opacity wrapper during native buffering. Loading state resets synchronously on stretch change, so late fade completion cannot re-enable it. Both new regressions failed before correction; all157 tests now pass, type-check and lint pass (zero errors, existing1148 warnings). No other review suggestions changed.

The first engine review used a three-dot merge base that included previously merged PR7 changes. For the follow-up, baseline823219b has exactly the same tree as fetched main1f34538 (`git diff --quiet 823219b origin/main` exit0); it isolates the current release fixes without re-reviewing merged sound/workflow changes.

## Remaining low findings — authorized follow-up

- Removed the render-time media ref write; only committed effects update it.
- Keyed source loading by media identity so recreated equivalent stretch objects cannot restart an in-flight request.
- Corrected stale uncommitted/HEAD statements in this record and the handoff; retained earlier activation state explicitly as an archived snapshot.
- Both new lifecycle regressions failed before the fix and passed afterward (eight focused tests total). The discarded-render harness shares refs but discards pending effects/state; it tests the specific race, not full native/concurrent React behavior.

Final follow-up checks: `npm test`159 passed, zero failures/skips; `npm run type-check`, `npm run lint` (zero errors), and `git diff --check` passed. Earlier full mobile exports passed; these corrections add no native configuration or dependencies.
