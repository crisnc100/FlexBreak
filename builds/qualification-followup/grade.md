# Independent review

**Verdict: all five criteria pass on code and artifact inspection, with the device and account claims still unproven.** Two caveats on my evidence: I had no shell in this session, so I could not produce the git diff and graded the current file contents instead. I also did not run tests, lint, or type-check; the seat owns that.

## Criteria

| # | Criterion | Grade | Evidence |
|---|---|---|---|
| 1 | iOS launch, storyboard, colorset | PASS (code) | Storyboard has only centerX/centerY constraints on the `SplashScreenLogo` image view with a declared 100x100 resource. Named color components equal #4776E6 exactly, and the colorset matches. Android keeps its own white background and logo override. The PNG renders fully blank, consistent with transparent, but I could not confirm its dimensions. |
| 2 | Cold video loading, no MP4 into Image, stale results ignored | PASS (code) | See lifecycle notes below. |
| 3 | Coach filters catalog before transitions, all paths | PASS (code) | The premium filter runs once and feeds all three `selectStretches` calls, including the relaxed and full-body fallbacks. The selector and post-processor only insert transitions between stretches and strip trailing ones, so a pre-filtered pool cannot yield leading or adjacent transitions. |
| 4 | iOS AdMob app ID matches live account | PASS (config) | The app ID in app.json is byte-identical to the readback. Android still carries Google's sample app ID, deferred as planned. The readback itself says verification and serving approval are not established, and I could not check the AdMob account. |
| 5 | Deterministic checks, independent review, no overrides | Partial | This is the read-only review. Nothing in these files weakens tests or gates. Suite result pending from the seat. |

**Unverified premise.** The plan says Expo's no-image storyboard path is broken. I confirmed the plugin calls `removeImageFromSplashScreen` when no image is set, but I did not verify that path produces a bad storyboard. The transparent-image workaround is sound regardless.

## Source and effect lifecycle in StretchFlowView

The design is correct and double-guarded. The rendered `videoSource` is derived by matching the stored key against the current media key, so a stretch change hides the old video on the same render, before any effect runs. The loader publishes only when its `active` flag and the ref key both still match. The Video element is keyed on the media key, not the timer, and ActiveRoutine passes the same routine item reference every tick, so timer updates never re-run the loader. Error callbacks are guarded by the same ref. Unmount nulls the ref and flips `active`, covering both the resolve and reject paths.

Regression risks, all low:

- **Spinner can reappear briefly on cached videos.** The stretch-change effect starts a 150 ms fade-out and sets loading true in its completion callback. If a cached video fires onLoad first, the fade-in interrupts the fade-out, whose callback still runs and turns the spinner back on until the next playback status update clears it. Cosmetic.
- **Loader effect depends on the stretch object reference.** Stable today because ActiveRoutine reads from state. Any future parent that spreads the stretch each render would re-request the source every render.
- **Transition preview is untouched and inconsistent.** It hands the raw Firebase URL straight to Video, and its own video check uses endsWith, which fails on token-signed URLs, so the seek-to-80% effect never runs for those. Pre-existing, outside this change.
- `isVideoLocal` is written and never read. Pre-existing.

## Test coverage, honestly assessed

**Media test is genuine logic coverage, not device coverage.** It executes the real transpiled component under a hand-rolled hook runtime and mocks only native surfaces and the loader. It proves: no Image or Video during cold load, spinner not inside the opacity-zero wrapper, correct Video props after resolve, out-of-order loader results and a stale onError ignored, no state writes after unmount on both resolve and reject, and the still-image path unchanged. Gaps: timeRemaining is fixed at 30, so timer independence is asserted by reading only. The asset, numeric, and direct-URL branches are unexercised. The runtime flushes effects manually, interleaves cleanups per effect rather than React's all-cleanups-first order, and completes animations synchronously, so it cannot catch timing races like the spinner note above. The plan's statement that the build39 phone cause remains untraced is accurate. This fix removes one plausible cause without proving it was the cause.

**Coach test is genuine but does not isolate fallbacks.** It runs the real parser, config builder, selector, post-processor, and catalog with a seeded random generator, and asserts no leading, trailing, or adjacent transitions, correct transition durations, only accessible stretches for free users, and at least three stretches with media. Whether the relaxed or full-body fallback actually executes for the chosen prompt is not asserted, so "including fallback paths" rests on reading, not on the test. The comment that seeds 1 and 3 previously failed is not something I could verify without the old code.

**Downstream check for the coach fix.** I traced FlexChatModal to the global navigate hook, RoutineScreen, and ActiveRoutine's custom-stretch branch. That branch clones items and runs the premium-info enhancer, which copies transitions untouched and never filters premium stretches, so nothing downstream re-inserts transitions or reintroduces the gap.

**Launch chain on the JS side.** App renders IntroManager on first frame, whose loading placeholder is a solid #4776E6 view, and the animated SplashScreen gradient starts at the same blue. No code calls preventAutoHideAsync, so the native splash drops on first render and color continuity is what hides the handoff. Actual appearance still needs the new build.
