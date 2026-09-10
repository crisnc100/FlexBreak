# Coach style independent review

**Verdict: PASS on code read, with two things I could not execute.** Bash is disabled in this session, so I did not run the test file and could not diff the service against HEAD. Everything below is from reading the current working-tree files.

**Evidence per criterion**

- **Brief instruction for ordinary text.** `src/services/ai/core/aiWellnessService.ts:426-433` appends a localized brief-advice block only when output mode is text and the domain is not workout. English and Spanish ask for 2–4 short sentences or at most 3 short bullets, around 60–90 words. Chinese asks for 2–4 short sentences or at most 3 bullets, about 100–150 characters, which is the standard equivalence for that English length. Falls back to English for unknown languages.
- **Provider paragraphs stay paragraphs.** The bulletizing pass `enforceTextPlanConciseness` runs only under `outputMode === 'text' && domain === 'workout'` (lines 508-511). Ordinary text goes through `formatAIResponse` alone, which returns bullet text unchanged and otherwise only inserts paragraph breaks between sentences (conversationManager.ts:340-361). No new truncation or reshaping was added for non-workout replies.
- **Workout formatting retained.** Workout branch keeps the 6–10 bullet, ~180 word instruction in all three languages (lines 419-425) and still runs the conciseness pass.
- **Safety footer retained.** `applySafetyFooter` runs after formatting for every non-notification text reply (line 512) with the same localized injury and self-harm messages (lines 599-645). Unchanged by this feature.
- **Cap 300.** `getModelConfig` still returns the config base tokens; both free and premium are 300 in `src/config/aiConfig.ts:34,39`. Request passes `modelConfig.maxTokens` (line 494).
- **CTA local, eligibility filtering preserved.** CTA path returns without calling the provider (lines 447-482). `buildRoutineFromInput` still filters `allStretches` by `isRewardUnlocked('premium_stretches')` before selection and in all fallbacks (lines 199-226).

**Test file.** `tests/coach-response-style.test.mjs` covers each criterion: per-language prompt regexes for the brief block, absence of the old `6–9|160–220` wording, `maxTokens` 300, no bullets in a short ordinary reply, footer on injury input, workout bullets preserved, and stretch CTA with zero provider calls. The whitespace-normalized equality on line 63 correctly tolerates the paragraph breaks `formatAIResponse` inserts.

**Unverified.** The assertion on line 60 that the previous prompt wording was `6–9` / `160–220` is a claim about the pre-change file that I could not confirm without git access. Test execution is also unverified; the orchestrator should run:

```
node --test tests/coach-response-style.test.mjs
```

No correctness issues found in the code as it stands.
