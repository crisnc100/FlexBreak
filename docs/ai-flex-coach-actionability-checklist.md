# AI Flex Coach – Actionability & Reliability Checklist

Use this checklist to track implementation of the coach improvements.

## Scope Summary
- Add “Start Routine” CTA with deep‑link to `RoutineScreen`.
- Build routines from curated library (no hallucinations).
- Save short “memory notes” for continuity.
- Add a 1‑line weather context to AI prompt when available.

## Milestones
- [x] M1: Routine tool‑calling returns `routineParams` (grounded routine)
- [x] M2: Chat UI renders “Start Routine” and navigates to `Routine`
 - [x] M3: Memory note saved on generate/start routine
- [ ] M4: Weather line added to AI context (best‑effort)
- [ ] M5: QA acceptance checks passed (free + premium)

## Implementation Tasks

### A) Types & Response
- [ ] Extend `WellnessResponse` with `routineParams?: RoutineParams` (src/services/ai/core/aiWellnessService.ts)

### B) Routine Builder (Grounded)
- [ ] Add helper `buildRoutineFromInput(userInput)` that uses:
  - [ ] `parseUserInput` (src/utils/smart/parser.ts)
  - [ ] `generateRoutineConfig` (src/utils/smart/configBuilder.ts)
  - [ ] `selectStretches` (src/utils/smart/stretchSelector.ts)
  - [ ] Filter premium for non‑premium users (rewardManager)
  - [ ] Return `RoutineParams`
- [ ] Call builder on routine intent and include `routineParams` in service result
  - [x] Ensure ≥3 stretches by relaxing filters (position→All, then Full Body) when selection is too narrow

### C) Chat UI CTA
- [ ] In `FlexChatModal`, when AI message has `routineParams`, render CTA:
  - [ ] Title + meta (area • duration • position)
  - [ ] Button → `navigation.navigate('Routine', routineParams)`
  - [x] Remove non‑working “Continue” chip
  - [x] Use global navigation helper when modal isn’t under `NavigationContainer`

### D) Memory Notes
- [ ] Add helper to record a short “routine session note” in `memoryService` on:
  - [ ] Routine generated
  - [ ] Routine started (preferred)
- [ ] Confirm `memoryContext` appears in prompt via `aiWellnessService`
  - [x] Add `recent_routine` to memory and surface in `buildContext`

### E) Weather Context
- [ ] Append 1‑line weather to AI prompt (best‑effort):
  - [ ] Check `areWeatherNotificationsEnabled()` (locationService)
  - [ ] Use cached `getWeatherData(lat, lon)` if available
  - [ ] Format with `generateWeatherMessage(weather)`
  - [ ] Append to `context.appContext` in `contextBuilder`

### F) Domain Detection & Branching
- [x] Add `inferRoutineDomain` + `decideOutputMode` (stretch/workout)
- [x] Stretch → CTA mode: local routine + minimal message (no LLM)
- [x] Workout → Text mode: compact bullets, trimmed length, no CTA
- [x] Ambiguous default routing (no clarify): prefer stretch CTA when a body area is present; otherwise workout text
- [x] Positive feedback short‑circuit: brief acknowledgment; no follow‑up choices

## Acceptance Criteria
- [ ] “Give me a 10‑minute neck routine” → AI returns concise steps + Start Routine CTA
- [ ] Routine plays with curated stretches (no invented moves), respects position/tags
- [ ] After user starts routine, subsequent chats reference preferences subtly
- [ ] With weather enabled and cached, prompt includes a compact weather line; otherwise no change
 - [x] Workout requests produce compact bullet plans (not long paragraphs)
 - [x] Positive feedback on a suggestion results in a short acknowledgment (no A/B prompt)

## Test Plan
- [ ] Free user routine flow works; premium gating respected
- [ ] Premium user includes premium stretches
- [ ] Non‑routine queries do not show CTA
- [ ] Weather on/off toggles weather line presence without errors
- [ ] Offline/no location: chat still works; no weather line

## Rollout
- [ ] Add feature flag `@ai_routine_cta_enabled`
- [ ] Internal testers first, then ramp

## Notes
- Keep prompts compact; routines are built locally for reliability and cost.
- Weather is best‑effort; skip if not cached/available.
