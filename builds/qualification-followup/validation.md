# Validation — September 10, 2026

- `npm test`:155 passed, zero failures/skips.
- `npm run type-check`:passed.
- `npm run lint`:zero errors,1148 warnings in existing codebase; warnings not suppressed.
- `npm run export:mobile`:iOS and Android exports passed.
- `git diff --check`:passed.
- Read-only Fable reviews: launch/media/catalog/account config, voice, and coach style pass on static inspection. Reviewer had no shell; test execution belongs to the seat. See adjacent grade documents.
- Initial Chinese footer test expected wording different from existing safety footer. Corrected expectation to existing text; production safety footer unchanged. Final full suite above includes corrected regression.
- All code is uncommitted. No new preview or production deployment. No published policy/App Store changes or readiness overrides.
- Device recording/transcription, first stretch loading, native splash, and live brevity remain unverified. Backend restart snapshot had no second attempt; do not claim persistence verified.

## Confirmed review fixes

Cris authorized both spinner findings from `reviews/2026-09-10-20-13-33/code-review.md`. Loading overlay is now outside the video opacity wrapper during native buffering. Loading state resets synchronously on stretch change, so late fade completion cannot re-enable it. Both new regressions failed before correction; all157 tests now pass, type-check and lint pass (zero errors, existing1148 warnings). No other review suggestions changed.

The first engine review used a three-dot merge base that included previously merged PR7 changes. For the follow-up, baseline823219b has exactly the same tree as fetched main1f34538 (`git diff --quiet 823219b origin/main` exit0); it isolates the current release fixes without re-reviewing merged sound/workflow changes.
