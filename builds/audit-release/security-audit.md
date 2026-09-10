# FlexBreak security audit

Date: 2026-09-09. Scope: checked-out mobile application source and native/build configuration. This audit did not change application code, use credentials against external services, inspect deployed backend implementations, or verify distributed application artifacts. Only this report was written.

The findings below identify source-level defects and release-verification gaps. They do not assert that checked-in Firestore rules are currently deployed. Remediation proposals are recommendations, not authorization to redesign authentication, deploy rules, or change the app's supported features.

## Prioritized findings

### SEC-01 — P1: Firestore rules permit global unauthenticated reads and writes

Evidence: `firestore.rules:6`, `:11`, `:16`, and `:21` allow all reads/writes to `fcm_tokens`, `user_reminders`, `verifiedEmails`, and `oneTimeCodes`. `src/services/fcmTokenService.ts:72-87` stores real Expo push tokens in the first collection. `src/services/firebaseService.ts:72-83` writes email and verification metadata. `src/services/oneTimeCodeService.ts:139-223` trusts code documents to grant promotional premium access.

Impact if these rules are deployed: an unauthenticated caller can enumerate and alter codes, email records, reminders, and push-token records. Code documents can be created or changed to grant premium. This is a data-integrity and confidentiality boundary failure, not a leaked Firebase configuration secret.

Safe disposition: verify deployed rules and inventory legitimate anonymous clients before any deployment. Plan server-owned code issuance/redemption and owner-scoped reminder/token records using an authenticated installation identity. Do not simply change all rules to deny access: existing anonymous clients depend on these paths, and SEC-04 documents a permission-error fallback that would then become reachable. Backend remediation requires a concrete compatibility plan and is outside this audit's code-edit scope.

### SEC-02 — P1: Entitlements outlive verified expiration

Evidence: `src/services/iapService.ts:265-298` computes expiration from the current date, without store receipt validation. Restore selects historical purchases and formats them as newly active subscriptions at `:508-543`. `src/services/storageService.ts:163-225` trusts the stored ordinary premium flag without checking paid subscription expiration. `src/context/PremiumContext.tsx:85-107` loads that flag and updates access from `isActive`. A source search found no caller of `isSubscriptionActive` beyond its declaration. Free-code success additionally invokes `setPremiumStatus(true)` at `src/components/SubscriptionModal.tsx:317`, setting the ordinary flag even though the promotional grant has its own expiry.

Impact: paid access is not reconciled against actual expiration/refund/revocation; restoring history creates a new synthetic term. Promotional access can remain enabled after the promotional expiry because the independent ordinary flag remains true. These paths do not require an attacker to modify device storage.

Safe disposition: define a compatible entitlement migration that distinguishes paid, promotional, and development sources. Obtain actual store status and expiration, and compute effective access from those sources while preserving legitimate offline access policy. Preserve discount SKUs, family grants, upgrade notifications, rewards, and themes. Do not revoke existing users based solely on the current synthetic expiry field.

### SEC-03 — P1: Android release configuration uses the tracked debug signing key

Evidence: `android/app/build.gradle:97-112` defines the debug keystore and selects `signingConfigs.debug` for the release build. `git ls-files` confirms `android/app/debug.keystore` is tracked.

Impact: applications built with this configuration use a publicly reproducible signing identity; a holder of that key can sign replacement packages compatible with installations using that identity. Actual distributed artifacts, Play signing, and EAS overrides were not examined, so this is a confirmed configuration finding rather than a claim about the store artifact.

Safe disposition: establish the existing release-signing path before editing. Configure release signing with the managed/private identity and verify an actual release artifact certificate. Do not rotate signing identities or change publishing credentials as part of this audit.

### SEC-04 — P2: Verification-code redemption fails open and is not atomic

Evidence: `src/services/oneTimeCodeService.ts:253-259` invokes local redemption after permission denial. The local path at `:284-327` accepts a format-valid code for discount verification and selected patterns for free premium without a production guard. The online path warns rather than rejects mismatched email at `:170-173`; the current UI passes an empty email at `src/components/SubscriptionModal.tsx:298`. Read/check/update at `oneTimeCodeService.ts:139-180` are separate operations.

Impact: permission failures can turn verification into format-only approval; codes are not reliably one-use under concurrent requests. Email mismatch behavior means possession, not identity, is the practical redemption boundary.

Safe disposition: document whether family/promotional codes are intentionally transferable. Move validation and consumption into an atomic server operation and retire production format-only fallback with an explicit service-unavailable response. Do not enforce email matching in isolation: the present UI has no email value and would break. Preserve intentional family and discount-code use cases.

### SEC-05 — P2: Delete AI Wellness Data leaves retained conversations

Evidence: `src/components/settings/ai/AIDataManagement.tsx:120-150` deletes wellness memory, selected settings, and `@ai_wellness_conversation_${userId}` before confirming permanent deletion. It does not clear the separate session storage or in-memory map. `src/services/ai/core/conversationManager.ts:263-272` persists full session messages under `@ai_conversation_session_${userId}`; `:240-253` reloads recent messages and `:81-88` reuses in-memory sessions. A suitable `clearSession` method already exists at `:279-282`. `memoryService.clearMemory` at `src/services/ai/memory/memoryService.ts:583-584` only removes the current memory key, not legacy memory.

Impact: a user can receive a deletion-success message while sensitive conversation content remains on disk and can return to a later session. This concerns the dedicated AI deletion control, not a claim that the general Reset All Data misses every storage key.

Safe disposition: this is a candidate for a narrow application fix. Reuse `conversationManager.clearSession`, clear relevant legacy/current memory and history, invalidate active conversation UI state, and cancel associated pending AI notifications. Establish the user-ID/storage-key paths first. Validate by creating a conversation, deleting AI data, reopening the coach, and restarting the app; verify disk keys and in-memory state are empty. Preserve routines, achievements, premium access, and unrelated reminders. Avoid a blanket `AsyncStorage.clear()`.

### SEC-06 — P2: Reachable privacy copy contradicts storage and transmission

Evidence: `src/components/settings/ai/AIDataManagement.tsx:164-189` states that no data leaves the device and full conversations are not stored. This UI is reachable from `src/components/settings/DataManagement.tsx:56`. In contrast, `src/services/ai/integrations/secureAIService.ts:30-40` transmits messages; `secureGoogleSpeechService.ts:26-38` transmits audio; and `src/services/ai/core/conversationManager.ts:263-272` stores message content.

Impact: users receive materially inaccurate information when deciding what sensitive wellness information to provide or what deletion means.

Safe disposition: narrowly replace demonstrably false local-only/no-transcript claims with accurate descriptions of local storage and remote AI/speech processing. Do not invent vendor retention guarantees; deployed provider handling remains unknown. Keep chat and voice available. Confirm the public privacy policy separately before asserting consistency with it.

## Backend release-verification gap

`src/services/ai/integrations/secureAIService.ts:34-40` and `secureGoogleSpeechService.ts:30-38` send only the public Supabase anonymous key and a caller-controlled user ID. Neither request attaches a Firebase ID token or app-attestation proof. The app supports an anonymous user flow. Local filesystem checks confirmed that both `functions/` and `supabase/` are absent, although `firebase.json` references a functions source directory.

Consequently, server-side identity checks, usage quotas, premium enforcement, model allowlists, audio-size limits, retention, and provider-secret storage could not be inspected. Do not describe unchecked server abuse as a demonstrated deployed exploit. Review the deployed function code/configuration and cost limits before concluding these endpoints are protected. Authentication/rules architecture changes require a compatibility plan that retains the supported anonymous experience.

## Other coverage and exclusions

- Inspected security configuration, Firebase initialization, AI/speech integrations, IAP, premium context/storage, code verification, push-token handling, AI deletion/privacy UI, weather/location requests, iOS transport settings, and Android signing/manifest.
- A scoped tracked-text scan found no private-key or recognized provider-secret patterns. This is not proof of a complete secret-history audit. No `.env` file exists in this worktree; `.env.example` is present. Firebase client settings and the Supabase **anon** key are public configuration, not service-role/admin credentials.
- `src/config/weather.config.ts:1-3` imports an OpenWeather key through `@env`; a supplied value would be bundled client-side. The actual build-time key and account restrictions were not verified.
- iOS ATS disables arbitrary loads at `ios/FlexBreak/Info.plist:59-62`; inspected AI, speech, and weather endpoints use HTTPS.
- Android allows backup at `android/app/src/main/AndroidManifest.xml:19` while receipts and wellness memory use AsyncStorage. Backup exclusions and artifact-level behavior merit review; this alone does not demonstrate remote data exposure.
- Production raw-log leakage was excluded as a finding: `App.tsx:134` invokes `disableConsoleLogsInProduction`, whose implementation disables log/debug/info and ordinarily warnings/errors in release. Debug builds still log transcripts and purchase objects.
- Settings developer premium controls are protected by `__DEV__` at `src/screens/SettingsScreen.tsx:404`; do not remove useful development features as a supposed production exploit.
- The code's `ConfigValidator` secure-mode shortcut verifies neither a deployed service nor its controls. Base64/reversal helpers were not reported as active cryptographic weaknesses because an active security-sensitive use was not established.
- No rules were deployed, no credentials were tested against live services, no application binaries were built or inspected for this sub-audit, and no app code was modified.

## Isolated fixes suitable for a separate authorized implementation

1. Complete the AI-data deletion path, with meaningful retained-session and reopen/restart verification (SEC-05).
2. Correct demonstrably false in-app privacy statements without claiming unverified backend retention (SEC-06).

Entitlement migration, cloud-rule changes, backend authentication, and signing changes should remain explicit release work items until their compatibility and deployment facts are available. An audit request alone is not a reason to break existing anonymous, family-code, premium, reminder, or voice flows.
