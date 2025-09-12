---
name: "AI Flex Coach – Actionability & Reliability"
about: Implement Start Routine CTA, grounded routines, continuity memory, and weather context
title: "AI Flex Coach: Actionability & Reliability"
labels: ["feature", "ai", "routine", "weather"]
assignees: []
---

## Summary
Implement the AI Flex Coach upgrades:
- Actionability: Start Routine CTA with deep-link to Routine screen
- Grounded routines (no hallucinations) using Smart Routine pipeline
- Continuity via short memory notes
- Weather line in AI context (best-effort, cached)

## Tasks
- [ ] Extend `WellnessResponse` with `routineParams?: RoutineParams`
- [ ] Build `buildRoutineFromInput(userInput)` using parser/configBuilder/stretchSelector
- [ ] Filter premium stretches for non-premium users
- [ ] Return `routineParams` with AI reply on routine intent
- [ ] FlexChat: render CTA under AI message and navigate to `Routine`
- [ ] Memory: record small “routine session note” on generate/start
- [ ] Context: append 1-line weather when enabled/cached

## Acceptance Criteria
- [ ] Request for a routine returns concise steps and a working Start Routine CTA
- [ ] Routine uses real stretches, respects tags/position/premium
- [ ] Follow-up chats feel progressive (subtle memory notes)
- [ ] Weather line appears only when enabled and cached; otherwise unchanged

## Test Plan
- [ ] Free vs premium flows (gating validated)
- [ ] Routine navigates and runs in `RoutineScreen`
- [ ] Non-routine queries do not show CTA
- [ ] Weather on/off behavior validated
- [ ] Offline/no location path doesn’t break chat

## Rollout
- [ ] Feature flag `@ai_routine_cta_enabled` added and initially off
- [ ] Internal testers rollout, then ramp

## References
- docs/ai-flex-coach-actionability-plan.md
- docs/ai-flex-coach-actionability-checklist.md

