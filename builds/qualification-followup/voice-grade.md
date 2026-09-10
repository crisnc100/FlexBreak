# Voice independent review

Checking the last details now: the iOS format ID mapping and the enum values. I have what I need, so here is the verdict.

**PASS on static review**, with two low-risk notes. I could not execute the tests because Bash is disabled in this session, so test results are unverified here.

**Flattened options match the installed normalizer.** expo-audio 57.0.4's `createRecordingOptions` spreads common fields then the platform block. The service does the same in `voiceRecordingService.ts:79-81`, dropping the nested `ios`/`android`/`web` keys. The only difference is that the SDK emits an explicit `directory: undefined` key. Both native records treat a missing directory as cache, so behavior is identical. The native-media test compares against the real SDK normalizer for both platforms and asserts the nested keys are gone.

**Native constructors accept the flattened shape.**
- iOS `RecordingOptions` requires `extension`, `sampleRate`, `numberOfChannels`, `bitRate`, `audioQuality`. All are supplied after the spread. `outputFormat: 'lpcm'` goes through the four-character-code converter, which yields kAudioFormatLinearPCM. Bit depth 16, little endian, non-float are forwarded to the AV keys. The constructor builds the AVAudioRecorder immediately, and the no-argument `prepareToRecordAsync` passes nil so the constructed recorder is reused rather than rebuilt.
- Android `RecordingOptions` requires only `extension`. `'amrwb'` and `'amr_wb'` are exact enum values mapping to MediaRecorder AMR_WB output and encoder. Sample rate, channel count and the 23850 bit rate are all applied.

**Permissions and lifecycle retained.** Permission is requested before the audio mode is set, and denial returns false. Cancellation stops, releases, deletes the file idempotently, and clears the stored URI. The stale-generation branch after prepare releases and deletes. Audio mode is reset to non-recording on stop and on every error path. Both deletion tests exercise these paths and the AI-data delete flow calls cancel twice.

**Recording Failed alert.** It fires only when start returns false and the generation is still current, so a deletion-triggered false return does not show a spurious alert. Start never throws, so the message is reached deterministically. The copy correctly points at microphone settings.

Two notes, neither blocking:
- **Double release in the race path.** If deletion cancels while prepare is in flight, cancel releases the recorder, then the stale branch releases it again. The test tolerates this. Whether a second release on a released Expo shared object is silent on device is unverified.
- **Device behavior remains unverified.** Static match to native option records only. Actual AVAudioRecorder and MediaRecorder acceptance of these settings needs a device run.
