# Independent release grade — initial pass

Reviewer: claude-fable-5-1; successful response, read-only. This is the initial grade; subsequent fixes and final verification are recorded separately.

Evidence gathering is complete. Writing the grade now.

## Grade: PASS on all seven bars, no reachable regression or bypass found. Two low-severity code notes and one process gap.

Method: read-only. No commands run, no tests executed here. "Trunk" below means the main checkout at the repository root, which I read for the shipped-client document shapes.

### Bar 1: mandatory real PR-safe CI checks, no secret exposure — PASS

- `.github/workflows/ci.yml` runs on `pull_request`, `push` to main/staging/develop, and `workflow_call`. All three jobs are `contents: read`, checkout the event SHA with `persist-credentials: false`, and reference no `secrets.*` at all. Fork PRs therefore see nothing.
- Checks are real: lint, `tsc --noEmit`, node tests, prod-only audit at high, both-platform export, pinned Deno check/lint/test, and the rules suite under `firebase emulators:exec` with two demo project IDs. `security-tests/firestore/rules.test.mjs:7` refuses a non-loopback emulator host.
- `release.yml:31` reuses the CI workflow without `secrets: inherit`, so the quality gate never receives the Expo token.

### Bar 2: release trusted main SHA, exact successful artifact, store target, serial, wait, no auto-commit — PASS

- Trusted source is enforced twice: `release.yml:25-28` (`github.ref == refs/heads/main`) and `scripts/release.mjs:11` (dispatch event, main ref, 40-hex SHA). Checkout is pinned to `github.sha`.
- `validateBuildResult` (`release.mjs:27-41`) requires exactly one build, `FINISHED`, matching platform, project ID, `gitCommitHash === GITHUB_SHA`, profile `production`, distribution `STORE`, not simulator, https artifact URL. Submission uses `--id <that build>` with `--wait`, never `--latest`.
- Store targets: Android `track: internal` (`eas.json:72`, `release.mjs:48`); iOS summary text labels the result as TestFlight processing, never public release.
- Serialized by concurrency group with `cancel-in-progress: false`. `contents: read` and no git write commands anywhere. The `eas.json` rewrite is runner-local and restored in `finally`.
- Gap outside code: the `production` GitHub environment's branch restriction and reviewers are manual setup (documented in the guide, not enforceable from the repo).

### Bar 3: native migration preserves audio units, status, listener cleanup, codecs, cache behavior — PASS

- Units: `mediaStatus.ts` converts seconds to milliseconds both ways. `nativeAudio.ts` maps `currentTime`, `duration`, `playing`, `isBuffering`, `didJustFinish`, `error` to the old status shape. I verified against the installed types that `AudioStatus` includes `error: string | null` and `isLoaded`, `createAudioPlayer(source, options)` takes an options object, and `AudioPlayer` exposes `currentStatus`, `seekTo`, `setPlaybackRate`, `shouldCorrectPitch`, `remove()`.
- Listener cleanup: `Sound.unloadAsync` removes the subscription and the player exactly once (`removed` flag); the 30s load timeout path removes its listener and unloads on failure. `NativeVideo.tsx` removes all five subscriptions in the effect cleanup and relies on `useVideoPlayer` for release. Verified `sourceLoad`, `statusChange`, `playingChange`, `timeUpdate`, `playToEnd`, `bufferedPosition`, `timeUpdateEventInterval`, `replaceAsync` exist in the installed expo-video types.
- Codecs: recorder options are WAV/LPCM 16-bit 16k mono on iOS and AMR-WB 16k mono on Android; `secureGoogleSpeechService.ts:19` declares `LINEAR16` or `AMR_WB` by extension; the backend `supabase/functions/_shared/speech.ts:12-22` accepts exactly those two at 16000 and checks the AMR-WB magic header. The legacy `WEBM_OPUS` default only applies on the v1 path.
- Cache: `videoCacheService.ts` keeps the legacy file-system API (`documentDirectory`, `getInfoAsync`, `downloadAsync`, `deleteAsync`) and the same index key. Note that in the routine flow, `StretchFlowView` calls `videoLoaderService.getVideoSource`, which always streams; `videoCacheService` has no runtime caller. That is pre-existing, not a migration regression.
- All callers (`ActiveRoutine`, `DemoVideoPlayer`, `StretchFlowView`, `PremiumStretchesPreview`, `soundEffects`) use only the surfaced contract.

### Bar 4: phase0 rules compatible with shipped clients, bounded, no enumeration, no minting, immutable expiry/use; strict final deny — PASS

I compared `firestore.phase0.rules` against the trunk services that shipped clients run:

- `fcm_tokens`: trunk writes `device_${Platform.OS}_${Date.now()}` with `{token, device, createdAt: serverTimestamp, anonymous: true}`. Matches `legacyToken` and `tokenShape` exactly.
- `user_reminders`: trunk writes `device_${Date.now()}_${random36(9)}` with the 11 fields in `reminderShape`, `time` from `TimePicker.tsx:56-58` zero-padded HH:mm, integer `premiumLevel`, `getTimezoneOffset()` within bounds, and only writes when a token exists. Matches.
- `oneTimeCodes`: trunk does `getDoc` then `updateDoc` of exactly `{used, usedBy, usedAt, usedAtTimestamp}`. Allowed only when `usedBy == resource.data.email` and `expiresAtTimestamp` is present and in the future. Create/delete/list denied. Expiry and email cannot change because they are outside `affectedKeys`. Concurrency test proves single winner.
- `verifiedEmails` discount path: trunk writes the same five keys; `backedDiscount` binds to the consumed code within ten minutes. Free-premium writes and `premiumUsers` are denied, and the trunk wraps those in try/catch and continues locally, as the rollout doc states.
- Trunk never calls `signInAnonymously`, so every shipped client hits the unauthenticated legacy branches; the owner branches are for the new client only.
- Strict: `firestore.rules` is deny-all and the suite asserts it against authenticated former owners.
- Residual, documented, not a code bug: guessed device IDs remain overwritable; codes without backfilled `expiresAtTimestamp` are non-redeemable, and the trunk's `permission-denied` handler then falls back to offline acceptance (`oneTimeCodeService.ts:254-258` in trunk). Rules cannot fix an old binary.

### Bar 5: no false release readiness before backend, anonymous auth, accounts, native physical checks — PASS

`scripts/release-readiness.mjs` records both platforms and four service integrations as `blocked` with no env override; `assertReleaseReady` runs in `release.mjs:70` before any EAS call, including build-only. `tests/release.test.mjs` proves every missing or blank evidence record throws.

### Bar 6: repeating local reminders, selected days, premium +2h with day rollover, disable failure — PASS

`notificationScheduler.ts:25-65`: validates HH:mm and day list, cancels both reminder types, schedules `WEEKLY` triggers per selected day, adds the +2h premium copy only at level ≥3 with `(hours+offset)/24` day carry, and rolls back created IDs on any failure. `reminderService.ts:17-22` cancels strictly before scheduling, so an OS cancel error returns false. Tests cover all four cases.

### Bar 7: motivational start never cancels premium reminders — PASS

`startLocalMotivationalMessages` cancels `MOTIVATIONAL` only; `scheduleProductionMotivationalMessages` cancels `MOTIVATIONAL` and `WEATHER_MOTIVATIONAL`; `refreshWeatherNotifications` cancels `WEATHER_MOTIVATIONAL`. Reminders carry `data.type` of `scheduled_reminder` / `premium_reminder`, so `getNotificationType` never misclassifies them. The `cancelAllScheduledNotificationsAsync` in `notifications.ts:620` sits in a cluster (`scheduleReminders`, `scheduleRealReminder`, `setupBackgroundScheduling`) with no callers outside that file. `storageService.clearAllData` also cancels all, but that is the explicit reset action.

### Low-severity code notes (not bar failures)

1. `reminderService.ts:15` persists `REMINDER_ENABLED=true` before scheduling; on scheduling failure the UI flips the toggle off but storage stays enabled, so the next launch retries silently. Minimal fix: persist settings after scheduling succeeds, or write `enabled=false` in the catch.
2. `plugins/withModularHeaders.mjs` is unreferenced by `app.json`. Dead file, harmless.

### Needs live-credential verification (cannot be judged from source)

- EAS build JSON field names (`gitCommitHash`, `project.id`, `buildProfile`, `distribution`, `isForIosSimulator`) against a real EAS CLI 24 run.
- Non-interactive `eas submit` with the stored ASC API key and EAS-managed Play service account.
- Remote version initialization for `autoIncrement`.
- The four service readiness records and both native records, exactly as the guide lists them.
