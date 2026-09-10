# Independent scope advice

Verified model: `claude-fable-5-1`; `is_error: false`. See plan for adopted/rejected points.

**Scope verdict: the brief is right-sized on release, over-sized on performance.** Qualification stays primary. The preview action is a small, safe add that Cris should get now because it removes the one terminal chore he actually faces today. Performance work should be cut to a measurement plan until a binary exists to measure.

## Decision 1: preview automation now, or qualification first

**Do the preview action now, small.** Evidence that it does not overlap existing safeguards:

- No preview workflow exists. The three workflows are CI, backend deploy, and automatic production. The preview build 37 was a manual EAS command from the docs, which is exactly the terminal chore Cris wants gone.
- The release script cannot be reused for preview. `scripts/release.mjs` rejects any ref other than main, any action other than build-only or build-and-submit, and any build whose profile is not production with store distribution. It also calls the current-main-tip check before every EAS command. A preview action therefore needs its own tiny script and cannot accidentally route through the production gate, which is the property you want.
- The preview profile inherits production's autoIncrement and production environment. Every preview consumes a build number and uses production runtime values. The docs already acknowledge this. The new action should say it plainly in its summary.

Shape: one `workflow_dispatch` workflow on any branch, runs `eas build --profile preview --platform ios --wait --json`, writes the install URL and build ID to the job summary, and on failure writes the first EAS error line in plain words. Reuse the existing readiness and preflight code for nothing. Preview is explicitly exempt from readiness because it is the evidence-gathering path.

**Cut:** no install page beyond the job summary link. EAS already hosts the internal-distribution install page. Building a second page is the release framework the brief warns against.

## Decision 2: smallest simplification without a new framework

Two artifacts, nothing else:

1. The preview workflow above.
2. A one-page operator card, replacing nothing. Three procedures: get a test build, ship to TestFlight, retry after failure. Each is a GitHub click path with no shell. The existing CI setup guide stays as the engineering reference. The card should state that a green production run means TestFlight upload, not public release, matching what the workflow summary already prints.

**Cut:** any public-release automation. The readiness records are all still blocked and the production path already refuses to run. Automating App Store review submission before the gate opens would be code with no path to execute. Revisit only after TestFlight is proven.

## Decision 3: best performance investigation without a new binary

**Establish the baseline instrument first, not fixes.** Two findings from the read, both grounded:

- **AdMob is initialized twice and the ordering contradicts the code's own comment.** `App.tsx:80` says AdMob init is deferred until after audio is configured, but `App.tsx:138` initializes it on first mount, before the sound system sets its DoNotMix audio mode. The post-audio call at line 830 then sets request configuration after the SDK is already up. Whether this causes a user-visible audio or startup effect is unverified. It is a correctness question worth one device test, not a refactor.
- **The AI initializer double call is guarded.** The singleton sets its initialized flag at the end of the first run. The second call at line 728 happens only after the intro completes plus a delay, so it returns early in practice. Not a bottleneck. Cut from the perf list.
- **The existing performance utility is unused where it matters.** It has a first-render mark and an async-operation timer, but only four files reference them and none wrap startup work. There is no cold-start number anywhere.

Recommended scope: wrap the startup effects in App.tsx with the existing timer and print one summary line after MainApp renders. That gives cold-start, routine-load, and chat-open numbers from the next preview build with no new dependency. Fix nothing until those numbers exist.

**Cut:** any caching, lazy-loading, or bundle-splitting work. Speculative without a baseline.

## Questions only Cris can answer

1. **Should preview builds use the production runtime environment?** They do today by inheritance. Recommendation: keep it. Changing it means a separate EAS environment and a second set of variables, which is more operator surface.
2. **Performance focus.** Default to the biggest measured bottleneck after the baseline exists. If Cris already feels a specific slowness, name it and instrument that path first.
