# Independent privacy grade — initial pass

Read-only claude-fable-5-1, successful response. Initial findings are being repaired before final validation.

**Grade: PASS on all six criteria at the code level, with one High finding outside the twelve owned files and two small hardening fixes inside them.** Native device behavior (recorder stop during preparation, notification `data` shape, clipboard) is unverified and listed separately.

| Criterion | Result | Evidence |
|---|---|---|
| Deletion drains/rejects in-flight work; late requests cannot restore disk or UI | PASS | Registration before work `aiDataLifecycle.ts:18-19`; invalidate, cancel, drain, remove order `:26-34`. Every AI writer is tracked (`conversationManager.ts:83,120`, `memoryService.ts:82-574`, `costMonitor.ts:79,125`, `voiceRecordingService.ts:24,109,157`, `notificationScheduler.ts:28,158`, `systemInitializer.ts:36,59,266`, `aiWellnessService.ts:267`, `FlexChatModal.tsx:271,291,344,728`). Untracked AI-key writers are removals only (`contextBuilder.ts:75`, `conversationManager.ts:293`). UI continuations gated by generation (`FlexChatModal.tsx:413-508,514-600`, `AIWellnessNotificationHandler.tsx:60-115`). Late init/debounce flags gated (`systemInitializer.ts:110`, `notificationScheduler.ts:83,456`). |
| All AI sessions, history, memory, settings cleared; routine/progress/paid/auth untouched | PASS | Inventory `localAIData.ts:5-7` matches every `@ai_`/`@flexchat_` key in the repo, across user ids. In-memory caches cleared (`deleteAIData.ts:15`, `notificationScheduler.ts:440`, `systemInitializer.ts:22`). Removal is filtered; verification `deleteAIData.ts:19-20`. |
| Recording file and callback cleanup | PASS (one path UNVERIFIED on device) | Cancel before and after drain `deleteAIData.ts:14,32`; `record()` gated `voiceRecordingService.ts:79-83`; stopped-but-untranscribed file kept in `recordingUri` `:123,132` and deleted by `:244-248`; transcription `finally` `:232-235`. |
| Cancels only AI notifications | PASS | Filter `deleteAIData.ts:8-10`. All AI types start with `ai_` (`notificationManager.ts:174-175`, `AIWellnessToggle.tsx:58,131`); no non-AI type does (`notificationManager.ts:5-14`). Every production scheduler sets `data` (`notificationManager.ts:189-196`, `notifications.ts:528,708`, `firebaseReminders.ts:78,168`, `services/notificationScheduler.ts:48,285,339`). No push tokens registered. |
| Export is the full local dataset and a real copy | PASS | `localAIData.ts:9-18` exports every inventory key, no cap. Copy sets real JSON, stale copy rejected `AIDataManagement.tsx:63-64`. |
| Privacy copy distinguishes provider data truthfully | PASS | `AIDataManagement.tsx:82,95,114-116,127`. Backend forwards messages to OpenRouter/Groq (`_shared/chat.ts:67-89`) and audio to Google (`_shared/speech.ts:148-158`); Firestore holds only per-uid usage counters, leases and timezone (`_shared/quota.ts:18-48`, `_shared/handler.ts:62`), never content. |

**Findings**

- **High, outside owned files: deletion is unreachable once the coach is turned off.** `DataManagement.tsx:56` renders the Export/Delete section only when `@ai_wellness_enabled === 'true'`. Toggling off writes `'false'` (`AIWellnessToggle.tsx:119`) but leaves conversations and memory on disk, so the users most likely to want deletion cannot reach it. After a successful deletion the same gate hides the section on next expand, and `AIWellnessSettings.tsx:12-21` keeps showing the toggle ON until remount. Repro: enable coach, chat, toggle off, open Settings, expand Data Management. Fix: render `<AIDataManagement visible={expanded} />` unconditionally, subscribe `AIWellnessSettings` to `onAIDataDeleted` to set enabled false, and say in the success alert that the coach was turned off.

- **Low, owned: late-prepared recorder file is not deleted on device.** In `voiceRecordingService.ts:79-82` the post-prepare cancel finds `this.recording` already null, because the pre-drain cancel cleared it at `:134`. The real recorder's `uri` is null until prepared (`expo-audio AudioModule.types.d.ts:247`), so the pre-drain cancel deletes nothing either. The test at `privacy-lifecycle.test.mjs:133-150` passes only because the mock exposes `uri` before prepare. `record()` is never called, so the file has no audio. Fix: use the local `recording` in that branch.
  ```ts
  if (!isAIDataCurrent(generation)) {
    const uri = recording.uri; recording.release();
    if (this.recording === recording) this.recording = null;
    if (uri) await FileSystem.deleteAsync(uri, { idempotent: true });
    return false;
  }
  ```

- **Low, owned: notification `data` is optional in the expo types** (`Notifications.types.d.ts:391,514`). `isAINotification(undefined)` at `deleteAIData.ts:9` would throw after storage was already wiped, making every retry report "Deletion Failed" and leaving AI notifications scheduled. Only the unimported dev helper `directNotificationTest.ts:22-25` schedules without `data` today. Fix: `(data?: Record<string, unknown> | null) => !!data && (...)`.

- **Residue not covered by export or deletion, metadata only:** `@rate_limit_voice_transcription_<userId>` and `@rate_limit_ai_chat_*` counts keyed by user id (`reliabilityService.ts:149-177`), `@last_notification_processed` holding the last AI notification id (`aiNotificationHandler.ts:136`), and `ai_wellness_chat` error counts in `@error_metrics` (`reliabilityService.ts:313`). The full app reset already clears the notification key (`storageService.ts:953`); worth adding to the inventory.

**Race paths checked and clean:** synchronous registration; nested `trackAIWork` rejection during drain aborts the outer flow and no catch path writes an AI key (`aiWellnessService.ts:584-609` writes only `@error_metrics`); double stop between pre-drain cancel and an in-flight `stopRecording` is idempotent; both startup `initialize()` calls (`App.tsx:215,728`) racing deletion end with `initialized=false` and their check-ins cancelled after drain; notification-tap handler cannot reopen chat after deletion because the enabled flag is gone (`aiNotificationHandler.ts:73-77`).

**Notes, not privacy defects:** deletion can block up to 90 s behind an in-flight backend call (`backendClient.ts:25`) with only a spinner. Callers without try/catch produce unhandled rejections if deletion is in progress (`AIWellnessOnboarding.tsx:87`, `AIWellnessPremiumUpgrade.tsx:93,104`, `FlexChatModal.tsx:728`). A stale clipboard copy is rejected silently with no feedback.
