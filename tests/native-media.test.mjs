import test from 'node:test';
import assert from 'node:assert/strict';
import { createLoader } from './helpers/load-typescript.mjs';

test('audio adapter waits for load, preserves timing, seek/rate and releases exactly once', async () => {
  const listeners = new Set();
  const calls = [];
  const native = {
    isLoaded: false, playing: false, currentStatus: { isLoaded: true, playing: true, currentTime: 1.25, duration: 10.5, isBuffering: false, didJustFinish: false },
    addListener: (_, callback) => { listeners.add(callback); return { remove: () => listeners.delete(callback) }; },
    seekTo: async value => { calls.push(['seek', value]); },
    play: () => calls.push(['play']), pause: () => calls.push(['pause']),
    setPlaybackRate: value => calls.push(['rate', value]), remove: () => calls.push(['remove']),
  };
  const statuses = [];
  const load = createLoader({ externalMocks: { 'expo-audio': { createAudioPlayer: () => native }, 'react-native': { Platform: { OS: 'ios' } } } });
  const { Sound } = load('src/utils/nativeAudio.ts');
  let resolved = false;
  const creation = Sound.createAsync(1, { shouldPlay: false }, value => statuses.push(value)).then(result => { resolved = true; return result; });
  await Promise.resolve(); assert.equal(resolved, false);
  native.isLoaded = true;
  for (const callback of [...listeners]) callback(native.currentStatus);
  const { sound } = await creation;
  for (const callback of [...listeners]) callback({ ...native.currentStatus, didJustFinish: true });
  assert.equal(statuses[0].positionMillis, 1250);
  assert.equal(statuses[0].durationMillis, 10500);
  assert.equal(statuses[0].didJustFinish, true);
  await sound.setPositionAsync(2500); await sound.setRateAsync(0.9, true);
  assert.equal(native.shouldCorrectPitch, true);
  await sound.unloadAsync(); await sound.unloadAsync();
  assert.deepEqual(calls, [['seek', 2.5], ['rate', 0.9], ['remove']]);
  assert.equal(listeners.size, 0);
});

test('video adapter preserves completion, first frame, load, buffered milliseconds and imperative controls', async () => {
  const events = new Map();
  const effects = [];
  const cleanups = [];
  const statuses = [];
  let loaded = 0; let ready = 0; let starts = 0;
  const player = {
    playing: false, currentTime: 2.25, duration: 12, bufferedPosition: 8, status: 'readyToPlay',
    addListener: (event, callback) => { events.set(event, callback); return { remove: () => events.delete(event) }; },
    replaceAsync: async () => {}, play() { this.playing = true; }, pause() { this.playing = false; },
  };
  const react = {
    forwardRef: value => value, useRef: value => ({ current: value }),
    useEffect: callback => effects.push(callback), useImperativeHandle: (ref, callback) => { ref.current = callback(); },
  };
  const load = createLoader({ externalMocks: {
    react, 'react/jsx-runtime': { jsx: (component, props) => ({ component, props }) },
    'expo-video': { useVideoPlayer: () => player, VideoView: 'VideoView' },
  } });
  const { Video } = load('src/components/media/NativeVideo.tsx');
  const ref = { current: null };
  const view = Video({ source: { uri: 'https://example.com/video.mp4' }, shouldPlay: true, positionMillis: 1750,
    progressUpdateIntervalMillis: 250, onLoad: () => loaded++, onLoadStart: () => starts++, onReadyForDisplay: () => ready++, onPlaybackStatusUpdate: status => statuses.push(status) }, ref);
  effects.forEach(callback => { const cleanup = callback(); if (cleanup) cleanups.push(cleanup); });
  events.get('sourceLoad')();
  assert.equal(loaded, 1); assert.equal(starts, 1); assert.equal(ready, 0);
  view.props.onFirstFrameRender(); assert.equal(ready, 1);
  assert.equal(player.currentTime, 1.75); assert.equal(player.timeUpdateEventInterval, 0.25);
  assert.equal(statuses.at(-1).playableDurationMillis, 8000);
  events.get('playToEnd')(); assert.equal(statuses.at(-1).didJustFinish, true);
  events.get('timeUpdate')(); assert.equal(statuses.at(-1).didJustFinish, false);
  await ref.current.setPositionAsync(3750); assert.equal(player.currentTime, 3.75);
  await ref.current.pauseAsync(); assert.equal(player.playing, false);
  cleanups.forEach(cleanup => cleanup()); assert.equal(events.size, 0);
});

for (const platform of ['ios', 'android']) test(`speech recorder passes normalized ${platform} options to native constructor and cleans up`, async () => {
  const deleted = []; const modes = []; let options; let releases = 0;
  class Recorder {
    constructor(value) { options = value; this.uri = `file:///voice${value.extension}`; }
    async prepareToRecordAsync() {} record() {} async stop() {} release() { releases++; }
  }
  const load = createLoader({ mocks: {
    'src/services/ai/integrations/secureGoogleSpeechService': {},
    'src/services/ai/utils/reliabilityService': {},
  }, externalMocks: {
    'react-native': { Platform: { OS: platform } },
    'expo-modules-core': { Platform: { OS: platform } },
    'expo-audio': { AudioModule: { requestRecordingPermissionsAsync: async () => ({ status: 'granted' }), AudioRecorder: Recorder }, setAudioModeAsync: async mode => modes.push(mode) },
    'expo-file-system/legacy': { deleteAsync: async uri => deleted.push(uri) },
    '@react-native-async-storage/async-storage': {},
  } });
  const recorder = load('src/services/ai/integrations/voiceRecordingService.ts').default;
  assert.equal(await recorder.startRecording(), true);
  assert.equal(options.sampleRate, 16000); assert.equal(options.numberOfChannels, 1);
  assert.equal(options.isMeteringEnabled, true);
  // Compare against the installed SDK's actual platform normalizer. Native iOS
  // constructs AVAudioRecorder immediately, before prepareToRecordAsync runs.
  const { createRecordingOptions } = load('node_modules/expo-audio/src/utils/options.ts');
  const reference = createRecordingOptions({
    extension: '.amr', sampleRate: 16000, numberOfChannels: 1, bitRate: 23850, isMeteringEnabled: true,
    ios: { extension: '.wav', outputFormat: 'lpcm', audioQuality: 32, sampleRate: 16000, linearPCMBitDepth: 16, linearPCMIsBigEndian: false, linearPCMIsFloat: false },
    android: { extension: '.amr', outputFormat: 'amrwb', audioEncoder: 'amr_wb', sampleRate: 16000 },
    web: { mimeType: 'audio/webm', bitsPerSecond: 128000 },
  });
  for (const [key, expected] of Object.entries(reference)) assert.equal(options[key], expected, `native ${key}`);
  assert.equal(options.ios, undefined); assert.equal(options.android, undefined);
  const uri = `file:///voice${platform === 'ios' ? '.wav' : '.amr'}`;
  assert.equal(await recorder.stopRecording(), uri);
  await recorder.cancelRecording();
  assert.deepEqual(deleted, [uri]); assert.equal(releases, 1);
  assert.equal(modes.at(-1).allowsRecording, false);
});

test('speech payload declares actual native codec and rejects mislabeled legacy AAC', async () => {
  const requests = [];
  const load = createLoader({ mocks: {
    'src/services/security/backendClient': { callBackend: async (endpoint, payload) => { requests.push({ endpoint, payload }); return { text: 'hello' }; } },
  }, externalMocks: { 'expo-file-system/legacy': { readAsStringAsync: async () => 'encoded-audio', EncodingType: { Base64: 'base64' } } } });
  const speech = load('src/services/ai/integrations/secureGoogleSpeechService.ts').default;
  assert.equal((await speech.transcribeAudio('file:///voice.wav')).text, 'hello');
  assert.equal((await speech.transcribeAudio('file:///voice.amr')).text, 'hello');
  assert.equal(await speech.transcribeAudio('file:///voice.m4a'), null);
  assert.equal(requests.length, 2);
  assert.equal(requests[0].endpoint, 'transcribe-audio-v2');
  assert.equal(requests[0].payload.encoding, 'LINEAR16');
  assert.equal(requests[1].payload.encoding, 'AMR_WB');
  assert.equal(requests[1].payload.sampleRateHertz, 16000);
});
