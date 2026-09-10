# Local AI privacy fixes

Scope: client-only AI export/deletion and concurrent work. No remote data deletion, identity reset, server quota reset, progress/reward changes, or reminder scheduling changes.

Implemented:
- Shared local AI key inventory (`@ai_*`, `@flexchat_*`, the two chat-open flags, AI local rate-limit prefixes and last-notification marker) powers complete export and deletion. Export preserves every stored record and all insights, including multiple user sessions; it excludes auth, entitlements, stretching progress and server quotas and unrelated local rate-limit state. AI-only local chat/transcription counters and the last AI notification marker are included. Shared @error_metrics diagnostic counts remain outside the export/deletion boundary, explicitly disclosed in the export and deletion UI. The UI copies real JSON and rejects a stale copy callback after deletion.
- Lifecycle registers pending work before invoking callbacks, invalidates open views immediately, rejects new operations during deletion, and drains existing work before removal. Deletion verifies storage removal and reports failure rather than reporting success. Retrying remains possible.
- Tracked memory/session mutations, AI scheduling, initializer/cost writes and voice operations. Conversation caches clear for all user IDs. Scheduling debounce and initialization state reset; stale work cannot restore those flags after invalidation.
- Voice recording is cancelled before and after draining work. Late native preparation cannot restart recording. Transcription always attempts file cleanup; its cached language is removed after pending transcription drains. Late transcription and AI response callbacks retain their original generation and cannot reopen/repopulate the chat.
- Cancellation/dismissal targets AI notifications only; stretching and other app notifications remain intact. Privacy text accurately describes local scope and clipboard export.

Files: `aiDataLifecycle.ts`, new `localAIData.ts`, `deleteAIData.ts`, `core/conversationManager.ts`, `memory/memoryService.ts`, `scheduling/notificationScheduler.ts`, `config/systemInitializer.ts`, `utils/costMonitor.ts`, `integrations/voiceRecordingService.ts`, `FlexChatModal.tsx`, `AIWellnessNotificationHandler.tsx`, `AIDataManagement.tsx`, and new `tests/privacy-lifecycle.test.mjs`. Existing mixed line endings preserved on unchanged lines to keep review focused.

Initial validation (2026-09-10, before Grade hardening):
- `node --test tests/privacy*.test.mjs`: 8/8 pass. Actual source tests cover late persistence, blocked new work, all-user session cache clearing, 123-insight export, failed removal/retry, synchronous registration race, delayed native transcription/preparation, selective notification removal, and delayed scheduling/debounce state.
- `npm test`: 89/89 pass, zero skipped (other agents' concurrently added tests included).
- `npm run type-check`: pass, zero diagnostics.
- ESLint on all 12 owned source files: zero errors, 48 existing warnings; no rule suppression or check narrowing.

These are deterministic mocked-native regressions, not physical-device recording/notification or UI interaction tests. Cross-family review and device validation remain the seat's release gates. No commits or deployment performed.


## Privacy Grade follow-up

The verified Fable Grade passed all six code-level criteria and identified three follow-up defects, now repaired:
- `DataManagement.tsx` always renders AI export/delete when expanded, even with the coach disabled. `AIWellnessSettings.tsx` subscribes to invalidation and protects its initial async read; successful deletion says the coach was turned off. Actual component regressions cover reachability and immediate toggle reset.
- Late native preparation now cleans the captured recorder and its URI directly, even when pre-drain cancellation cleared the shared recorder field. The regression now starts with a null URI and exposes it only after preparation, matching the reported native contract.
- Notification filtering tolerates missing/null `data`; the deletion regression includes both alongside AI and unrelated notifications.

Metadata handling adds only AI chat/transcription local rate-limit prefixes and the AI handler's last-notification marker. Unrelated limits, backend quotas, identity, purchases and progress remain intact. Shared `@error_metrics` is deliberately retained to avoid overwriting unrelated concurrent diagnostic writes; confirmation/success text and export metadata accurately disclose that retained diagnostic counts may include AI errors.

Onboarding, upgrade and new-conversation callbacks use a typed lifecycle-cancellation boundary; it ignores only expected deletion cancellation and rethrows real storage/network errors. Generation guards prevent stale completion callbacks. AI notification response work and late processed-marker writes also participate in lifecycle tracking.

Follow-up files additionally include `DataManagement.tsx`, `AIWellnessSettings.tsx`, `AIWellnessOnboarding.tsx`, `AIWellnessPremiumUpgrade.tsx`, `services/notifications/aiNotificationHandler.ts`, and `tests/privacy-settings.test.mjs`.

Latest validation: `node --test tests/privacy*.test.mjs` **12/12 passed**, followed sequentially by full `npm run type-check` **exit 0**. No installs, exports, audits or concurrent heavy checks ran in this pass. The earlier 8-test/full-suite/lint results above are historical checkpoints, not claims of rerunning them after this follow-up. Device/native interaction verification remains outstanding.

## Final toggle-write race follow-up

The final targeted grade identified an additional untracked AIWellnessToggle writer. Only `AIWellnessToggle.tsx` source changed in this repair: the complete toggle operation now runs through `runAIUIWork`, including enabled state, toggle count/timestamp and notifications. Deletion rejects new toggles and drains already pending writes before removal. Generation guards stop stale parent-state changes, scheduling continuations and success toasts after awaits. Expected lifecycle cancellation remains quiet; real errors retain logging and restore prior UI state only while current. Existing toggle-spam policy, ordinary enable/disable behavior and one-second input cooldown remain unchanged.

Actual-source regressions in `privacy-settings.test.mjs` cover a toggle during active deletion, deletion while either counter or enabled persistence is pending, normal scheduling/cooldown and real-write-failure rollback. Latest focused privacy run: **16/16 passed**; subsequent sequential full TypeScript check: **exit 0**. No other source, cloud action, install/export or commit in this pass. The unrelated latent explicit-cancel/in-flight reconciliation observation remains the seat's documented nonblocker.
