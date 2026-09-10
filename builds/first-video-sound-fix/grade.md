# Independent sound/video review

Verified Fable model and successful envelope.

**Verdict: PASS on all five bar items. No blocking findings.** Bash is disabled in this session, so I could not run the test file or `tsc`. Test and type-check outcomes are `unverified —` and are the one thing to run before shipping.

**Bar assessment**

- **Effects do not deactivate the session on completion or pause. PASS.** The installed expo-audio 57.0.4 iOS module deactivates the session in exactly two places: the constructor's `onPlaybackComplete` closure and the module `pause` function, both gated on `keepAudioSessionActive` being false. The sound effects loader now passes true on iOS, so both paths are skipped. Player `remove` does not touch the session.
- **Other audio callers and Android keep prior policy. PASS.** The adapter defaults the flag to false. The two other callers, the demo audio in DemoVideoPlayer and the preload in ActiveRoutine, pass no flag. Android's native constructor accepts the argument but never reads it, so the flag is inert there regardless.
- **Resource unload still works. PASS.** The adapter's unload path is unchanged and still guards against double release. The test asserts one native release per player, including after a second unload call.
- **Timer and video logic untouched. PASS.** Neither ActiveRoutine nor NativeVideo changed. The only source edits are the adapter option type and forwarding line, and the loader's option object in soundEffects.
- **Regression exercises a real sound effect to adapter options. PASS.** The test loads the real soundEffects module, calls the countdown sound, and asserts the options object handed to the library's player constructor. This is the same countdown sound ActiveRoutine plays when the first stretch begins, so the test covers the reproduced path.

**Correctness of the diagnosis.** The mechanism fits the symptom. The countdown sound plays at the start of the first stretch. When it finishes, the library's completion hook waited 100 ms, saw no expo-audio player active, and deactivated the shared session. Deactivating the session pauses the video's AVPlayer while the JavaScript timer keeps running. Disabling sound effects removes the only player that triggers that hook on the first stretch, which matches the user's observation.

**Lifecycle risks, non-blocking**

- **The session now stays active after effects finish.** With the app's doNotMix interruption mode, any external audio the user was playing is interrupted by the first click and no longer handed back when the effect ends. The library does not deactivate on backgrounding either, it only pauses players. The prior behavior was a resume after every effect, so this is a trade of stutter for silence, not a new interruption. Worth a note in the release, not a blocker.
- **Deactivation policy now rests on the demo audio player.** Its pause and stop calls still deactivate the session when no other expo-audio player is running. That is prior behavior and coincides with video pause, so it does not reintroduce the bug.
- **The test models the native contract with a mock.** Its `videoPlaying` assertion follows directly from the options assertion. That is acceptable for the stated scope, and the test's own comment says a physical iOS check is still required.

**Next step.** Run the test file and type-check, since neither was possible here:

```
npm test -- tests/sound-video-session.test.mjs
npm run type-check
```

The adapter's option type includes the new key and the library's option type accepts it, so I expect both to pass, but that is unverified in this session.
