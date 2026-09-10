# Sound effects must not pause stretch video

Observed in preview build37: first stretch's looping video starts then halts while the timer keeps counting. Same routine works with Sound Effects OFF after restart; ON reproduces.

Cause evidence: the adapter omitted expo-audio keepAudioSessionActive (default false). Installed iOS AudioModule deactivates shared AVAudioSession on effect completion/pause when its audio registry has no active player; expo-video is separate. Installed Audio.types explicitly documents this flag for effects playing alongside video. Exact sound/native timestamp not captured.

Fix: forward optional keepAudioSessionActive in Sound.createAsync, default false. Opt in only for iOS sound-effects creation. No changes to timer, video player, recording, demo audio, Android policy or release gates.

Acceptance: iOS effects request session preservation; their completion/pause does not request shared-session deactivation; other callers retain default false; sound resources release; regression covers real soundEffects->adapter boundary. Deterministic tests model the installed native contract and do not substitute for device qualification.

Validation: 140 app/tooling tests pass, no skips. Type-check passes. Targeted ESLint and diff whitespace checks pass. Independent read-only Fable review PASS, all five criteria; reviewer did not execute tests, seat did. Nonblocking lifecycle caveat: effects keep the doNotMix audio session active, so external music resumption/background behavior must be checked on device.

Device bar for next preview: sounds ON, cold-start routine first video loops continuously through effect completion with timer counting; pausing timer does not pause loop; transition and next stretch still work. Check audio stops appropriately on background and normal voice/demo playback remains usable. Build37 remains baseline and does not contain fix.
