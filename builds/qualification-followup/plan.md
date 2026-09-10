# Build39 device follow-up

Goal: correct launch presentation and independently reproduced coach/media defects, verify production account configuration, then continue device/backend qualification. Preserve all blocked gates until actual evidence exists.

Acceptance:
1. iOS launch shows no square logo before existing animated intro; transparent PNG + blue native/background avoids Expo's broken no-image storyboard path. Clean generated storyboard has valid constraints and blue colorset. Android splash unchanged; native device appearance pending new build.
2. Cold video source renders loading, never Image with MP4; resolved source renders looping video independent of timer, stale results/errors can't replace current stretch. Still images preserved. Exact build39 phone cause remains untraced.
3. Coach selects eligible catalog BEFORE inserting transitions, including fallback paths. Free/premium seeded regressions enforce no leading/trailing/adjacent transitions and real stretch after transition. This is a separately reproduced defect, not asserted to be user's blank timed stretch.
4. iOS AdMob app ID matches owner's live account and App Store app6743581671. Android left deferred. AdMob dashboard reports app verification blocked because App Store developer website is missing; do not call ads fully ready.
5. Deterministic tests/lint/type-check pass; independent read-only review; new device preview required before readiness claims. No gate overrides, no real customer backend writes by agent.

Backend identity snapshots before/after first user prompt returned zero backendUsage requests records. Literal routine response generated locally by CTA branch, so this does NOT prove persistence or live provider operation. Waiting for actual chat prompt (sleep/concentration).

6. Voice recorder native constructor receives flattened platform settings matching installed Expo normalization; preserve iOS PCM16 WAV mono16k, Android AMR-WB, permissions and cleanup. Immediate Recording Failed reproduced at settings-contract level; device confirmation pending.
7. Ordinary coach answers request 2–4 short sentences or at most 3 bullets, about60–90 words, in all supported languages; workout formatting and safety footer retained. Keep token cap300 to avoid introducing more continuation calls.

2026-09-10 backend follow-up: one requests identity record appeared after typed sleep/concentration request. Restart snapshots through20:02 UTC show the same record but no additional attempt/update. User reports another answer; restart persistence and second provider call are NOT proven. No readiness gates changed.
