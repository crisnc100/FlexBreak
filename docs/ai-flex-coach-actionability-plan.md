# AI Flex Coach – Actionable Routines, Reliability, Continuity, and Weather Context

This document is a step‑by‑step implementation plan for external developers to enhance the AI Flex Coach so that:

- It produces actionable outcomes (“Start Routine”) that deep‑link into the in‑app routine flow.
- Routine suggestions are grounded in the app’s curated stretch library (no hallucinations).
- The coach maintains lightweight continuity via short “memory notes”.
- Current weather context is included when appropriate to make guidance feel timely.

It references concrete files and patterns in this repository to make implementation precise and fast.

---

## Snapshot of Current Architecture (for orientation)

- Chat UI: `src/components/wellness/FlexChatModal.tsx`
- AI Orchestration: `src/services/ai/core/aiWellnessService.ts`
- Prompting & context: 
  - `src/services/ai/core/promptManager.ts`
  - `src/services/ai/contextBuilder.ts`
  - `src/services/ai/core/conversationManager.ts`
  - `src/services/ai/memory/memoryService.ts`
- Model access (server): Supabase Edge Function `ai-chat-firebase` (already deployed)
- Smart Routine pipeline (grounded to real content):
  - `src/utils/smart/parser.ts` (parse user text)
  - `src/utils/smart/configBuilder.ts` (build routine config)
  - `src/utils/smart/stretchSelector.ts` (select stretches from library)
  - Source of truth stretches: `src/data/stretches.ts`
- Routine navigation targets:
  - `src/hooks/routines/useRoutineParams.ts`
  - `src/screens/RoutineScreen.tsx`
- Weather stack:
  - `src/services/locationService.ts`
  - `src/services/weatherService.ts`
  - `src/utils/weatherUtils.ts`
  - Toggle UI: `src/components/settings/ai/WeatherNotificationToggle.tsx`

---

## Goals & Outcomes

1) Actionability: AI replies include a “Start Routine” CTA that launches a real routine built from the app’s curated stretches.
2) Routine Reliability: No free‑form, model‑invented exercises. All routines come from `src/data/stretches.ts` via the Smart Routine pipeline.
3) Continuity: The coach stores small memory notes after key interactions (e.g., last area/duration/position) to keep follow‑ups relevant without high token costs.
4) Weather Context: When enabled and cached, include a 1‑line weather nudge in AI context for timeliness (e.g., “Clear and 72°F—perfect for a brief outdoor walk”).

---

## Deliverables (What you will add/change)

- AI return type extends to optionally include `routineParams: RoutineParams` from `src/types/index.ts`.
- AI service builds a real routine when routine intent is detected using the Smart Routine pipeline.
- FlexChat UI renders a “Start Routine” button when `routineParams` is present and deep‑links to the Routine screen.
- Memory service updated with a helper to store a short “session note” after routine generation/start.
- Context builder optionally appends a compact weather line when weather is enabled and cached.

---

## Step‑by‑Step Implementation

### 1) Types and Interfaces

- File: `src/types/index.ts`
- Ensure `RoutineParams` is exported (already present):
  - `{ area, duration, position, customStretches?, includePremiumStretches?, transitionDuration? }`
- Update AI response interface to carry routine params:
  - File: `src/services/ai/core/aiWellnessService.ts`
  - Extend `export interface WellnessResponse { ...; routineParams?: RoutineParams }`

### 2) Detect Routine Intent and Build a Grounded Routine

- File: `src/services/ai/core/aiWellnessService.ts`
- You already detect routine‑like queries:
  - `const isRoutineQuery = /...routine|plan|workout.../.test(userInput.toLowerCase())`
- Add a helper function inside the service (or a new module) to construct a routine from the real library:

```ts
import allStretches from '../../../data/stretches';
import { parseUserInput } from '../../../utils/smart/parser';
import { generateRoutineConfig } from '../../../utils/smart/configBuilder';
import { selectStretches } from '../../../utils/smart/stretchSelector';
import { RoutineParams, Stretch, RestPeriod, TransitionPeriod, BodyArea, Duration, Position } from '../../../types';
import { getTransitionDuration } from '../../storageService';
import * as rewardManager from '../../../utils/progress/modules/rewardManager';

async function buildRoutineFromInput(userInput: string): Promise<RoutineParams | null> {
  const parsed = parseUserInput(userInput);

  // Heuristics: infer duration if user hints at time; default to 5 or 10
  const lower = userInput.toLowerCase();
  const duration: Duration = lower.includes('15') ? '15' : lower.includes('10') ? '10' : '5';

  // Infer issue type based on parsed input (parser sets parsedIssue when possible)
  const issue = parsed.parsedIssue || 'stiffness';
  const transitionDuration = await getTransitionDuration();

  const config = generateRoutineConfig(parsed, issue, duration, transitionDuration);

  // Apply user‑selected position if present in text; else config picks a sensible default
  const routineItems = selectStretches(config, allStretches);

  // Premium gating: remove premium stretches for non‑premium users
  const hasPremiumAccess = await rewardManager.isRewardUnlocked('premium_stretches');
  const filtered = routineItems.filter(item => {
    if ('isTransition' in item) return true;
    const s = item as Stretch;
    return !s.premium || hasPremiumAccess;
  });

  // Build `RoutineParams` for navigation
  const area: BodyArea = (parsed.parsedArea && parsed.parsedArea[0]) || 'Full Body';
  const position: Position = parsed.parsedPosition || config.position || 'All';

  return {
    area,
    duration,
    position,
    customStretches: filtered as (Stretch | RestPeriod | TransitionPeriod)[],
    includePremiumStretches: hasPremiumAccess,
    transitionDuration
  };
}
```

- In `processWellnessCheckIn`, after you compute `safeResponse`, do:

```ts
let routineParams: RoutineParams | undefined;
if (isRoutineQuery) {
  routineParams = await buildRoutineFromInput(userInput) || undefined;
}
return { response: safeResponse, suggestedActions, category, routineParams };
```

### 2.5) Scalable Domain Detection and Output Modes (added)

- New module: `src/utils/smart/domainDetector.ts`
  - `inferRoutineDomain(userInput) → 'stretch' | 'workout' | 'ambiguous'`
  - `decideOutputMode(domain) → 'cta' | 'text' | 'clarify'`
- Branching in `aiWellnessService.processWellnessCheckIn`:
  - Stretch → CTA mode: build grounded `routineParams` locally and return a minimal message (no LLM) + Start Routine CTA.
  - Workout → Text mode: compact, bulleted plan (6–10 bullets, ~140–180 words), no CTA (trims long replies).
  - Ambiguous → Clarify mode: ask one A/B question only; sanitized to avoid UI references (“reply with ‘A’ or ‘B’”).
- Positive follow‑up short‑circuit: if last user feedback is positive, reply with a brief acknowledgment and end (no A/B prompt).
- Routine selection fallback: ensure ≥3 stretches by relaxing filters (position→All, then Full Body) when selection is too narrow.

### 3) Add “Start Routine” CTA in Chat UI

- File: `src/components/wellness/FlexChatModal.tsx`
- When adding the AI message to state, also keep the optional `routineParams` from the service call.
- Render a compact CTA block under the AI message when `routineParams` exists:

```tsx
// Pseudocode inside message render loop
{msg.type === 'ai' && msg.routineParams && (
  <View style={styles.routineCtaBox}>
    <Text style={[styles.routineTitle]}>Ready to start?</Text>
    <Text style={styles.routineMeta}>
      {msg.routineParams.area} • {msg.routineParams.duration} min • {msg.routineParams.position}
    </Text>
    <TouchableOpacity onPress={() => navigation.navigate('Routine', msg.routineParams)} style={styles.startButton}>
      <Text style={styles.startButtonText}>Start Routine</Text>
    </TouchableOpacity>
  </View>
)}
```

- Use existing navigation target: `navigation.navigate('Routine', routineParams)`

### 4) Memory Notes for Continuity

- File: `src/services/ai/memory/memoryService.ts`
- Add a helper to store a tiny, structured “last routine” note and preference signals (position, duration):

```ts
async function recordRoutineNote(userId: string, rp: RoutineParams) {
  await simpleMemory.updateMemory(userId, {
    // lightweight preference signals
    preferences: {
      responseStyle: 'practical',
      preferredExercises: []
    },
    usage: { lastCheckIn: Date.now() }
  });
  // Optionally add a tiny string field in unified memory if you want a direct context string
}
```

- Where to call it:
  - Immediately after generating `routineParams` (so the next AI reply can reference it), and/or
  - When the user taps “Start Routine” (more reliable indicator of intent).
- The prompt already includes `memoryContext` (via `aiWellnessService` → `memoryService.buildContext`), so these notes automatically feed the model context.

### 5) Weather Context in AI Prompt

- Goal: Append a single, compact weather line to context when user enabled weather and cached weather is available.
- File: `src/services/ai/contextBuilder.ts`
- Import helpers:

```ts
import { areWeatherNotificationsEnabled } from '../../services/locationService';
import { getWeatherData, generateWeatherMessage } from '../../services/weatherService';
```

- Append to `context.appContext` near the bottom of `buildUserContext`:

```ts
try {
  const enabled = await areWeatherNotificationsEnabled();
  if (enabled) {
    // Use a last-known location if you store it, else consider a no-op if unavailable
    // For simplicity, attempt a cached fetch by passing the most recent coords you store.
    // If you don’t retain coords, you can skip and rely on notification layer for weather.
    const locStr = await AsyncStorage.getItem('last_known_location'); // if you store it
    if (locStr) {
      const { lat, lon } = JSON.parse(locStr);
      const weather = await getWeatherData(lat, lon);
      if (weather) {
        const msg = generateWeatherMessage(weather);
        const weatherLine = `Weather now: ${weather.temp}°F, ${weather.condition}. ${msg.body}`;
        context.appContext = (context.appContext || '') + `\n${weatherLine}`;
      }
    }
  }
} catch {}
```

Notes:
- Keep it best‑effort: if location or weather isn’t available, skip without failing the chat.
- If you don’t store coords, consider writing them when enabling weather in `locationService.ts`.

### 6) Guardrails & Safety for Routines

- Only include stretches with `hasDemo === true` and appropriate `position`.
- Respect premium gating by replacing/removing premium stretches for free users.
- For pain‑related input, prefer beginner/gentle stretches, shorter routines, and include existing safety footer (already implemented in `aiWellnessService.applySafetyFooter`).

### 7) Analytics & Instrumentation (optional but recommended)

- Log the following (console or your analytics layer):
  - Routine intent detected (yes/no), duration inferred.
  - Routine generation success and number of stretches.
  - CTA tap rate (“Start Routine”) and completion (RoutineScreen end).
  - Truncated reply rate (should be near zero after server auto‑continue).

---

## Acceptance Criteria

- Routine intent → grounded routine:
  - “Give me a 10‑minute neck routine” returns an AI message with 4–6 concise steps (text) AND a “Start Routine” CTA that launches a curated routine (no invented moves).
- Reliability:
  - Selected stretches exist in `src/data/stretches.ts`, respect `position`, and render in `RoutineScreen` without errors.
- Continuity:
  - After the user starts a routine, the next chat contains subtle memory‑aware context (e.g., references earlier neck routine or duration preference) without increasing token costs significantly.
- Weather context:
  - When weather is enabled and cached, AI context includes a one‑line nudge; when disabled or unavailable, chat works normally.

---

## Test Plan

Manual
- Free user: ask for “10‑minute neck routine” → Start Routine launches and runs.
- Premium user: same, verify premium stretches appear.
- No routine intent: general wellness chat should not show routine CTA.
- Weather on/off: toggle weather in Settings; verify presence/absence of the weather line.
- Offline/No location: chat still works; no weather line; no crashes.

Unit/Integration (where feasible)
- Given a sample input, `parseUserInput` → `generateRoutineConfig` → `selectStretches` returns >2 stretches.
- Premium filtering removes premium stretches for non‑premium users.
- `buildRoutineFromInput` maps to a valid `RoutineParams` object.

---

## Rollout & Flags

- Add a simple feature flag (`@ai_routine_cta_enabled = true`) to allow staged rollout.
- Start with a small percentage (internal testers) and increase as metrics look good.

---

## Performance & Cost Notes

- Routine generation is local (no LLM) and fast; do not call network in the chat path except for the AI itself.
- Weather: prefer cached data; avoid triggering fresh fetches in the chat path if possible.
- Prompt remains compact; memory notes are short to minimize tokens.

---

## Open Questions (capture before coding)

- Do we store last‑known location for cheap weather context, or skip weather in chat if not available?
- Should “Save Routine” and “Remind Me Later” be part of v1 or a follow‑up?
- Do we want a “Share feedback” quick button after a routine to improve memory signals?

---

## Quick Reference (File Map)

- Chat UI CTA: `src/components/wellness/FlexChatModal.tsx`
- AI response type & orchestration: `src/services/ai/core/aiWellnessService.ts`
- Smart Routine pipeline: `src/utils/smart/{parser.ts, configBuilder.ts, stretchSelector.ts}`
- Stretches data: `src/data/stretches.ts`
- Routine navigation: `src/hooks/routines/useRoutineParams.ts`, `src/screens/RoutineScreen.tsx`
- Memory service: `src/services/ai/memory/memoryService.ts`
- Weather context: `src/services/weatherService.ts`, `src/services/locationService.ts`, `src/services/ai/contextBuilder.ts`

---

## Example Commit Messages

- feat(ai): add routineParams to WellnessResponse and routine builder tool‑call
- feat(ui): show “Start Routine” CTA in chat and deep‑link to RoutineScreen
- feat(memory): store routine session notes for lightweight continuity
- feat(ctx): add 1‑line weather context to AI prompt when enabled
