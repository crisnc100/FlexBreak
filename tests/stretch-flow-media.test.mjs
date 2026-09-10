import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import { createLoader } from './helpers/load-typescript.mjs';

const videoStretch = (id, file = id) => ({ id, name: `Stretch ${id}`, duration: 30,
  image: { uri: `https://storage.googleapis.com/example/videos/${file}.mp4` } });
const nodes = value => !value || typeof value !== 'object' ? [] : Array.isArray(value)
  ? value.flatMap(nodes) : [value, ...nodes(value.props?.children)];
const find = (tree, type) => nodes(tree).find(node => node.type === type);

// Execute the real component with persistent hook state; mock only native surfaces
// and the asynchronous loader. Effects retain dependency and cleanup semantics.
function harness(initialStretch = videoStretch('first')) {
  const slots = [];
  let cursor = 0;
  let pendingEffects = [];
  let mounted = true;
  let writesAfterUnmount = 0;
  const requests = [];
  const changed = (before, after) => !before || after.some((value, index) => value !== before[index]);
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], value => {
        if (!mounted) writesAfterUnmount++;
        slots[index] = typeof value === 'function' ? value(slots[index]) : value;
      }];
    },
    useRef(initial) { const index = cursor++; return slots[index] ??= { current: initial }; },
    useCallback(callback, deps) {
      const index = cursor++;
      if (changed(slots[index]?.deps, deps)) slots[index] = { deps, callback };
      return slots[index].callback;
    },
    useEffect(callback, deps) {
      const index = cursor++;
      if (changed(slots[index]?.deps, deps)) {
        const previous = slots[index];
        slots[index] = { deps, cleanup: previous?.cleanup };
        pendingEffects.push(() => { previous?.cleanup?.(); slots[index].cleanup = callback(); });
      }
    },
  };
  class Value { constructor(value) { this.value = value; } setValue(value) { this.value = value; } }
  const Animated = { Value, View: 'Animated.View', createAnimatedComponent: component => component,
    timing: (value, options) => ({ start(callback) { value.value = options.toValue; callback?.({ finished: true }); } }) };
  const native = Object.fromEntries(['View', 'Text', 'Image', 'TouchableOpacity', 'ScrollView', 'FlatList', 'ActivityIndicator'].map(name => [name, name]));
  const jsx = (type, props) => ({ type, props });
  const load = createLoader({ mocks: {
    'src/context/ThemeContext': { useTheme: () => ({ theme: {}, isDark: false, isSunset: false }) },
    'src/components/routine/DemoVideoPlayer': { default: 'Demo' },
    'src/utils/soundEffects': {},
    'src/services/videoLoaderService': { videoLoaderService: { getVideoSource: uri => new Promise((resolve, reject) => requests.push({ uri, resolve, reject })) } },
    'src/components/routine/utils': { NavigationButtons: 'Navigation' },
    'src/components/media/NativeVideo': { Video: 'Video', ResizeMode: { CONTAIN: 'contain' } },
    'src/components/routine/CircularTimer': { default: 'Timer' },
    'src/components/routine/StructuredInstructions': { default: 'Instructions' },
  }, externalMocks: {
    react, 'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { ...native, Animated, Dimensions: { get: () => ({ width: 400, height: 800 }) }, StyleSheet: { create: value => value }, Platform: { OS: 'ios' } },
    '@expo/vector-icons': { Ionicons: 'Icon' }, 'expo-haptics': {},
    'react-native-svg': { default: 'Svg', Circle: 'Circle', G: 'G' },
    'expo-linear-gradient': { LinearGradient: 'Gradient' },
  } });
  const { StretchFlowView } = load('src/components/routine/StretchFlowView.tsx');
  let stretch = initialStretch;
  const render = (next = stretch) => {
    stretch = next;
    cursor = 0;
    return StretchFlowView({ stretch, timeRemaining: 30, progressAnim: new Value(0), isPaused: true,
      onNext() {}, onPrevious() {}, onTogglePause() {}, currentIndex: 0, totalCount: 2,
      startTimer() {}, currentStretch: stretch, isPlaying: false });
  };
  const flushEffects = () => { const queued = pendingEffects; pendingEffects = []; queued.forEach(effect => effect()); };
  return { render, flushEffects, requests, writesAfterUnmount: () => writesAfterUnmount,
    unmount() { slots.forEach(slot => slot?.cleanup?.()); mounted = false; } };
}

test('cold timed video stays visibly loading until its source resolves, never mounting an Image', async () => {
  const h = harness();
  let tree = h.render();
  assert.equal(find(tree, 'Image'), undefined);
  assert.equal(find(tree, 'Video'), undefined);
  const loading = find(tree, 'ActivityIndicator');
  assert.ok(loading);
  // The pending spinner must not inherit the media's initially-zero opacity.
  assert.ok(!nodes(tree).some(node => node.type === 'Animated.View'
    && node.props.style.some(style => style?.opacity?.value === 0)
    && nodes(node).includes(loading)));
  h.flushEffects();
  tree = h.render();
  assert.equal(find(tree, 'Image'), undefined);
  assert.equal(h.requests.length, 1);
  h.requests[0].resolve({ uri: h.requests[0].uri, isLocal: false });
  await setImmediate();
  tree = h.render();
  const video = find(tree, 'Video');
  assert.equal(video.props.source.uri, h.requests[0].uri);
  assert.equal(video.props.shouldPlay, true);
  assert.equal(video.props.isLooping, true);
});

test('source changes hide the previous video immediately and ignore out-of-order loader results', async () => {
  const h = harness();
  h.render(); h.flushEffects();
  h.requests[0].resolve({ uri: h.requests[0].uri, isLocal: false }); await setImmediate();
  const oldVideo = find(h.render(), 'Video');
  assert.ok(oldVideo);
  let tree = h.render(videoStretch('first', 'replacement'));
  assert.equal(find(tree, 'Video'), undefined);
  assert.equal(find(tree, 'Image'), undefined);
  h.flushEffects();
  tree = h.render(videoStretch('third'));
  h.flushEffects();
  h.requests[2].resolve({ uri: h.requests[2].uri, isLocal: false }); await setImmediate();
  h.requests[1].resolve({ uri: h.requests[1].uri, isLocal: false }); await setImmediate();
  oldVideo.props.onError('late error from replaced video');
  tree = h.render();
  assert.equal(find(tree, 'Video').props.source.uri, h.requests[2].uri);
});

test('pending loader cannot publish after unmount, including rejected-source fallback', async () => {
  for (const reject of [false, true]) {
    const h = harness(); h.render(); h.flushEffects(); h.unmount();
    if (reject) h.requests[0].reject(new Error('load failed'));
    else h.requests[0].resolve({ uri: h.requests[0].uri, isLocal: false });
    await setImmediate();
    assert.equal(h.writesAfterUnmount(), 0);
  }
});

test('still images retain their Image rendering and load/error behavior', () => {
  const stretch = { id: 'image', name: 'Still', duration: 30, image: { uri: 'https://example.com/stretch.png' } };
  const h = harness(stretch);
  h.render(); h.flushEffects();
  const image = find(h.render(), 'Image');
  assert.equal(image.props.source.uri, stretch.image.uri);
  image.props.onLoad();
  assert.equal(find(h.render(), 'ActivityIndicator'), undefined);
  image.props.onError({ nativeEvent: { error: 'image failed' } });
  assert.ok(nodes(h.render()).some(node => node.props?.children === 'Image unavailable'));
});
