# First stretch pause

Symptom (user): "only the first video when I start a session it pauses the first stretch, but then the next ones dont do that".

Environment: likely new preview build37 but user confirmation pending. No device reproduction or event trace available. No playback edits made.

Repro required: start routine in installed build; record whether countdown also stops, whether pause occurs during 3-2-1 or after, manual Play vs spontaneous recovery, and whether each new session or only first after cold launch. Critical questions sent asynchronously.

Observed failure path: ActiveRoutine initializes showCountdown=true/countdownNumber=3 (72-73); countdown effect pauses timer and resumes at completion (920-972). StretchFlowView looping video shouldPlay=true/muted=true (463-470), independently of timer pause. NativeVideo forwards playingChange/statusChange and calls play on sourceLoad/shouldPlay changes. Demo view is separate, uses DemoVideoPlayer with autoPlay and separate audio synchronization.

Hypotheses:
- ALIVE: literal pause refers to intentional opening countdown; killed by a freeze after countdown or timer continuing while video freezes.
- UNTESTED: native video/audio interruption during first initialization; investigate native playing/status events alongside audio calls. Code has startup AdMob calls and expo-video doNotMix default; neither proves causation.
- UNTESTED: cold first-source buffering; killed by status readyToPlay with no buffering and stable loaded source during pause.
- UNTESTED: model of native library event order is wrong; vendored NativeVideo/expo-video source inspected, need actual device event sequence.
- RULED OUT for looping stretch view: routine paused prop directly disables video; its shouldPlay is constant true. Does not rule out timer state or separate demo player.

Next experiment: identify timer-vs-video and countdown-vs-postcountdown behavior before selecting instrumented boundary. No confirmed defect cause or speed claim yet.

## User clarification

First stretch looping video starts, then stops on its own. Timer continues normally. Loop should remain independent of timer even when timer is paused; transitions show next-stretch preview.

Intentional countdown/routine pause hypothesis is DEAD as cause of video halt. Native source replacement, buffering/loop boundary, audio session interruption remain untested. NativeVideo only reissues play at sourceLoad or shouldPlay prop change, not on unsolicited playingChange(false). This explains lack of automatic recovery if interrupted, but does not identify the original interruption. No native event trace yet.

## Isolating observation and cause

User confirms build37, sound effects OFF + restart makes same flow work; ON reproduces first video pause while timer runs. This isolates audio-triggered playback interruption, not routine state.

Exact installed library mechanism: src/utils/nativeAudio.ts Sound.createAsync calls createAudioPlayer(source, {updateInterval:250}) without keepAudioSessionActive. expo-audio/src/ExpoAudio.ts defaults that option false. expo-audio/ios/AudioModule.swift constructor onPlaybackComplete calls deactivateSession when false (lines 134-137); pause does likewise (246-247). deactivateSession checks only expo-audio registry playables then deactivates AVAudioSession.sharedInstance after 100ms (828-840), excluding expo-video player registry. The installed Audio.types.ts (113-126) explicitly documents keepAudioSessionActive for sound effects to avoid interrupting video when sound ends. NativeVideo never restores play after unsolicited native pause while shouldPlay stays true.

Verdict: sound-player shared-session deactivation is the code-backed cause matching the device toggle experiment. Exact triggering sound and native event timestamp remain untraced; first-only timing is not independently proven. Smallest candidate fix: preserve shared audio session for sound-effect players, scoped so recording/demo lifecycle behavior is not broadened accidentally. Regression tests must exercise finishing/pausing sound while a video plays, plus sound resource cleanup. Confirm on iPhone with sounds ON before declaring fixed. No playback patch applied during diagnosis.
