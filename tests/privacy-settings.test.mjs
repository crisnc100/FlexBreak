import test from 'node:test';
import assert from 'node:assert/strict';
import { createLoader } from './helpers/load-typescript.mjs';

function harness() {
  const slots = []; let index = 0; const effects = [];
  const react = {
    useState: initial => { const i = index++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = value; }]; },
    useEffect: callback => { effects.push(callback); },
  };
  const load = createLoader({ mocks: {
    'src/context/ThemeContext': { useTheme: () => ({ theme: {} }) },
    'src/components/settings/ai': { AIDataManagement: 'AIDataManagement' },
    'src/services/storageService': { KEYS: { AI_WELLNESS: { ENABLED: '@ai_wellness_enabled' } } },
    ...Object.fromEntries(['AIWellnessToggle','AIDebugButton','AINameSettings','AIScheduleSettings','WeatherNotificationToggle'].map(name => [`src/components/settings/ai/${name}`, { [name]: name }])),
  }, externalMocks: {
    react, 'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    'react-native': { View: 'View', Text: 'Text', TouchableOpacity: 'Button', StyleSheet: { create: value => value }, Platform: { OS: 'ios' } },
    '@expo/vector-icons': { Ionicons: 'Icon' },
    '@react-native-async-storage/async-storage': { getItem: async () => 'true' },
  } });
  function nodes(value) { if (!value || typeof value !== 'object') return []; if (Array.isArray(value)) return value.flatMap(nodes); return [value, ...nodes(value.props?.children)]; }
  return { load, nodes, effects, render: (component, props = {}) => { index = 0; return component(props); } };
}

test('expanded data management exposes AI export/delete without requiring enabled coach state', () => {
  const h = harness(); const component = h.load('src/components/settings/DataManagement.tsx').default;
  const initial = h.nodes(h.render(component));
  initial.find(node => node.type === 'Button').props.onPress();
  const expanded = h.nodes(h.render(component));
  assert.equal(expanded.find(node => node.type === 'AIDataManagement').props.visible, true);
});

test('settings toggle updates off immediately when local AI deletion invalidates data', async () => {
  const h = harness(); const component = h.load('src/components/settings/ai/AIWellnessSettings.tsx').AIWellnessSettings;
  h.render(component); h.effects.splice(0).forEach(effect => effect());
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.nodes(h.render(component)).find(node => node.type === 'AIWellnessToggle').props.enabled, true);
  await h.load('src/services/ai/aiDataLifecycle.ts').deleteAIDataExclusively(async () => {});
  assert.equal(h.nodes(h.render(component)).find(node => node.type === 'AIWellnessToggle').props.enabled, false);
});

function toggleHarness({ pauseKey, failWrite = false } = {}) {
  const values = new Map(); const changes = []; const toasts = []; const schedules = []; const timers = [];
  let resume; const paused = new Promise(resolve => { resume = resolve; });
  let started; const writeStarted = new Promise(resolve => { started = resolve; });
  const load = createLoader({ globals: { setTimeout: (fn, delay) => { timers.push({ fn, delay }); return 1; } }, mocks: {
    'src/context/ThemeContext': { useTheme: () => ({ theme: {} }) },
    'src/context/PremiumContext': { usePremium: () => ({ isPremium: false }) },
    'src/services/storageService': { KEYS: { AI_WELLNESS: { ENABLED: '@ai_wellness_enabled', USER_NAME: '@ai_wellness_user_name' } } },
    'src/services/ai/scheduling/notificationScheduler': { scheduleAIWellnessV2: async action => { schedules.push(action); } },
  }, externalMocks: {
    react: { useState: value => [value, () => {}] },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    'react-native': { View: 'View', Text: 'Text', Switch: 'Switch', StyleSheet: { create: value => value } },
    '@react-native-async-storage/async-storage': {
      getItem: async key => values.get(key) ?? null,
      setItem: async (key, value) => {
        if (failWrite) throw new Error('disk failed');
        if (key === pauseKey) { started(); await paused; }
        values.set(key, value);
      },
    },
    'react-native-toast-notifications': { Toast: { show: text => toasts.push(text) } },
    'expo-notifications': { scheduleNotificationAsync: async () => {}, SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval' } },
  } });
  const component = load('src/components/settings/ai/AIWellnessToggle.tsx').AIWellnessToggle;
  function nodes(value) { if (!value || typeof value !== 'object') return []; if (Array.isArray(value)) return value.flatMap(nodes); return [value, ...nodes(value.props?.children)]; }
  const rendered = component({ enabled: false, onToggle: value => changes.push(value) });
  return { toggle: nodes(rendered).find(node => node.type === 'Switch').props.onValueChange,
    lifecycle: load('src/services/ai/aiDataLifecycle.ts'), values, changes, toasts, schedules, timers, resume, writeStarted };
}

test('toggle invoked during deletion cannot recreate enabled state or toggle counters', async () => {
  const h = toggleHarness(); let finish;
  const deletion = h.lifecycle.deleteAIDataExclusively(() => new Promise(resolve => { finish = resolve; }));
  await h.toggle(true);
  assert.equal(h.values.size, 0); assert.deepEqual(h.changes, []); assert.deepEqual(h.toasts, []);
  finish(); await deletion;
});

for (const key of ['@ai_wellness_toggle_count', '@ai_wellness_enabled']) test(`deletion drains pending toggle write ${key} without stale UI success`, async () => {
  const h = toggleHarness({ pauseKey: key });
  const toggle = h.toggle(true); await h.writeStarted;
  let erased = false;
  const deletion = h.lifecycle.deleteAIDataExclusively(async () => { h.values.clear(); erased = true; });
  await Promise.resolve(); assert.equal(erased, false);
  h.resume(); await toggle; await deletion;
  assert.equal(h.values.size, 0); assert.deepEqual(h.changes, []); assert.deepEqual(h.toasts, []); assert.deepEqual(h.schedules, []);
});

test('normal toggle keeps scheduling and one-second cooldown; real write failure restores prior UI state', async () => {
  const h = toggleHarness(); await h.toggle(true);
  assert.equal(h.values.get('@ai_wellness_enabled'), 'true'); assert.equal(h.values.get('@ai_wellness_toggle_count'), '1');
  assert.deepEqual(h.changes, [true]); assert.deepEqual(h.schedules, ['enable']); assert.equal(h.toasts.length, 1); assert.equal(h.timers[0].delay, 1000);
  const failing = toggleHarness({ failWrite: true }); await failing.toggle(true);
  assert.deepEqual(failing.changes, [false]); assert.deepEqual(failing.toasts, []);
});
