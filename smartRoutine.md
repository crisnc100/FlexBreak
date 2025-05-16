Here’s a practical roadmap to turn Smart Routine Generator from a “keyword demo” into a reliable, modular feature that produces full-length, context-aware routines no matter what the user types.
──────────────────────────────────
1 MODULARISE THE PIPELINE
──────────────────────────────────
Move the three logical steps out of SmartRoutineGenerator.tsx / routineGenerator.ts and into their own files under src/utils/smart/.
A. parser.ts
 • parseUserInput() (improved, see §2)
 • small helpers ( tokenise, lemmatise, stop-word list )
B. configBuilder.ts
 • buildRoutineConfig(parsed, uiSelections) – decides areas, issueType, position, duration, transitionDuration, desk-friendly flag.
 • all heuristics live here; UI only passes user overrides.
C. stretchSelector.ts
 • selectStretches(config, stretches) – returns full array of Stretch | Rest | Transition.
 • contains all duration logic & balancing rules.
D. postProcessor.ts
 • sanitizeRoutine(routine) (you already added)
 • ensureVariety(routine, stretches, minCount) – duplicates / swaps in alternates when repeats detected.
 • fillToTargetTime(routine, stretches, maxSeconds) – pad with extra stretches + transitions until ≥ 90 % of requested time.
SmartRoutineGenerator then calls:
Apply to routineGener...
;
──────────────────────────────────
2 MAKE THE PARSER “SMARTER”
──────────────────────────────────
Current parser = simple substring match. Three quick upgrades that cost zero external libs:
2.1 Lightweight normalisation
Apply to routineGener...
;
2.2 Synonym tables
Add more synonyms for areas & issues (already partly done). Keep them in src/data/synonyms.ts so contributors can expand without touching code.
2.3 Phrase scoring
Instead of “first keyword wins”, scan all tokens and rank areas/issues by count.
Apply to routineGener...
;
This alone drops the “back = lower-back only” mis-classification.
──────────────────────────────────
3 GUARANTEE MULTIPLE STRETCHES
──────────────────────────────────
In stretchSelector.ts:
• Require a minimum count (e.g. 3) before leaving the first pass.
• If you still have < minCount, call fillWithSimilarStretches():
Apply to routineGener...
}
──────────────────────────────────
4 DE-DUPLICATION & VARIETY
──────────────────────────────────
Before returning, loop through routine and make sure no two consecutive stretches share the same id.
If they do, swap the second one with another stretch from the pool.
──────────────────────────────────
5 BETTER TRANSITION HANDLING
──────────────────────────────────
When you pad or rearrange the routine, always call insertTransitions(routine, transitionDuration) to rebuild transitions (simpler than trying to fix indices).
──────────────────────────────────
6 OPTIONAL: AI-ASSISTED PARSING
──────────────────────────────────
If you’re comfortable with one cloud call (OpenAI, PaLM, etc.), add a tiny endpoint:
Apply to routineGener...
”
Cache responses (by input hash) in AsyncStorage so you pay once per phrase.
──────────────────────────────────
7 UX IMPROVEMENTS
──────────────────────────────────
• If parser confidence is low (score < 2), show a follow-up chip:
“Not sure where you feel it most — Neck / Upper-Back / Lower-Back?”
• Display the chosen area/issue in the summary before the user taps “Create”.
──────────────────────────────────
8 TEST-DRIVE THE NEW FLOW
──────────────────────────────────
• Unit-tests for parser & selector.
• QA scripts: run 20 random phrases (“neck kink”, “post leg-day”, “whole body tired”) – assert ≥ 3 stretches & ≥ 80 % of requested duration.
──────────────────────────────────
RESULT
Your Smart Routine Generator will:
• Parse “my back hurts”, “ugh my shoulders are killing me after workout”, or even “need limbs loosen up”
• Always deliver a 3-5- or 10-minute routine filled to time with transitions, no duplicate stretches, correct “Get Ready” UI.