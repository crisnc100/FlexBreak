# Ask
Cris wants fully automated easy releases without terminal chores, plus meaningful user-facing performance improvements alongside the recent security work. He is not comfortable operating deployment tools. Advise on the smallest concrete next scope; do not implement.
# Known
Existing main workflow already performs quality checks, cumulative backend deployment, iOS build and exact artifact upload to App Store Connect. It stops before any deployment when required native/service evidence is blocked. It does not handle App Store review/public release. PRs #5/#6 merged. Credentials renewed for store and ad hoc through Sep 2027. Preview build 37 (3d58b13a-525f-4994-9927-993257a3bca5) launched from merged SHA e35ccb9; awaiting result. Six v2 routes deployed, 44 limited live checks pass; weather alone real provider checked. Device auth persistence, StoreKit, other providers, privacy publication, production ads and legacy containment outstanding. Google Play explicitly deferred. No claims of measured performance yet. App.tsx has multiple startup effects including two AdMob initialize calls and two AI initializers; inspect guards before judging redundant work.
# Direction
Finish qualification as existing primary goal. Add only missing ease-of-operation affordances after inspecting overlap: a GitHub preview action with install page and plain failure summary, and short release operator instructions. Do not replace existing production safeguards. Performance first establish a repeatable cold-start/routine/chat baseline, then address only verified bottlenecks. No broad refactor or speculative caching. Public release automation must be scoped distinctly from TestFlight; do not invent owner store settings. Human input pending on preferred performance focus (default biggest measured bottleneck).
# Decisions
1. Is new preview automation worth doing now or should qualification take precedence?
2. Smallest useful simplification that avoids another release framework?
3. What performance investigation has best value without a running new native binary?
# Read first
All under /Users/cortega/Documents/Projects/personal/FlexBreak/.worktrees/flexbreak-audit-release:
.github/workflows/auto-production.yml
scripts/release.mjs
scripts/release-readiness.mjs
docs/CI_CD_SETUP_GUIDE.md
App.tsx
src/services/ai/config/systemInitializer.ts
# Contract
Read-only. Ground claims in files. Return scope verdict, concrete advisory/cuts and only undecidable human questions with recommendations. Stop after advice. Do not edit, run probes, or access credentials.
