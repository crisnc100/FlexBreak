import test from 'node:test';
import assert from 'node:assert/strict';
import { createLoader } from './helpers/load-typescript.mjs';

const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
function harness() {
  const data = new Map();
  const cancelled = []; const dismissed = [];
  let voiceCancels = 0;
  const storage = {
    getItem: async key => data.get(key) ?? null,
    setItem: async (key, value) => { data.set(key, value); },
    getAllKeys: async () => [...data.keys()],
    multiGet: async keys => keys.map(key => [key, data.get(key) ?? null]),
    multiRemove: async keys => { keys.forEach(key => data.delete(key)); },
  };
  const notices = ['ai_wellness', 'stretch_reminder', 'ai_evening', 'streak', undefined, null];
  const load = createLoader({ externalMocks: {
    '@react-native-async-storage/async-storage': storage,
    'expo-notifications': {
      getAllScheduledNotificationsAsync: async () => notices.map(type => ({ identifier: type, content: { data: type == null ? type : { type } } })),
      getPresentedNotificationsAsync: async () => notices.map(type => ({ request: { identifier: type, content: { data: type == null ? type : { type } } } })),
      cancelScheduledNotificationAsync: async id => { cancelled.push(id); },
      dismissNotificationAsync: async id => { dismissed.push(id); },
    },
  }, mocks: {
    'src/services/ai/contextBuilder': { buildUserContext: async () => ({}), categorizeInput: () => 'general', detectLanguage: () => 'en' },
    'src/services/ai/integrations/voiceRecordingService': { cancelRecording: async () => { voiceCancels++; } },
  } });
  return { data, storage, cancelled, dismissed, load, voiceCancels: () => voiceCancels,
    lifecycle: load('src/services/ai/aiDataLifecycle.ts'),
    conversation: load('src/services/ai/core/conversationManager.ts').conversationManager,
    erase: load('src/services/ai/deleteAIData.ts').deleteLocalAIData,
    exportData: load('src/services/ai/localAIData.ts').exportLocalAIData,
  };
}

test('deletion invalidates views immediately, drains old writes, rejects new writes and keeps unrelated data', async () => {
  const h = harness();
  for (const key of ['@ai_memory_u1', '@flexchat_conversation', '@flexchat_voice_intro_shown', '@show_flexchat_on_open', '@flexbreak:open_flexchat_after_settings', '@user_id', '@user_progress', '@rate_limit_server', '@user_premium']) h.data.set(key, 'private');
  const gate = deferred(); const started = deferred();
  const generation = h.lifecycle.getAIDataGeneration(); let invalidated = false;
  h.lifecycle.onAIDataDeleted(() => { invalidated = true; });
  const oldWrite = h.lifecycle.trackAIWork(async () => { started.resolve(); await gate.promise; h.data.set('@ai_late_reply', 'late'); });
  await started.promise;
  let removed = false;
  const removal = h.erase().then(() => { removed = true; });
  assert.equal(invalidated, true);
  assert.equal(h.lifecycle.isAIDataCurrent(generation), false);
  await assert.rejects(h.lifecycle.trackAIWork(async () => h.data.set('@ai_new', 'blocked')), /deletion/);
  await Promise.resolve(); assert.equal(removed, false);
  gate.resolve(); await oldWrite; await removal;
  assert.deepEqual([...h.data.keys()].sort(), ['@rate_limit_server', '@user_id', '@user_premium', '@user_progress'].sort());
  assert.deepEqual(h.cancelled, ['ai_wellness', 'ai_evening']);
  assert.deepEqual(h.dismissed, ['ai_wellness', 'ai_evening']);
  assert.equal(h.voiceCancels(), 2);
  assert.equal(h.lifecycle.isAIDataCurrent(generation), false);
  await h.lifecycle.trackAIWork(async () => h.data.set('@ai_new_session', 'new'));
  assert.equal(h.data.get('@ai_new_session'), 'new');
});

test('all in-memory user sessions clear, including a message whose persistence overlaps deletion', async () => {
  const h = harness();
  await h.conversation.addMessage('one', 'assistant', 'first private reply');
  await h.conversation.addMessage('two', 'assistant', 'second private reply');
  const original = h.storage.setItem;
  const gate = deferred(); const started = deferred();
  h.storage.setItem = async (key, value) => { started.resolve(); await gate.promise; await original(key, value); };
  const pending = h.conversation.addMessage('one', 'assistant', 'late reply');
  await started.promise;
  const removal = h.erase(); gate.resolve(); await pending; await removal;
  assert.equal(h.data.size, 0);
  assert.equal((await h.conversation.getOrCreateSession('one')).messages.length, 0);
  assert.equal((await h.conversation.getOrCreateSession('two')).messages.length, 0);
});

test('export includes complete local records and every user session without auth/progress or a fifty-insight cutoff', async () => {
  const h = harness();
  const insights = Array.from({ length: 123 }, (_, id) => ({ id, detail: `private ${id}` }));
  h.data.set('@ai_improved_memory_one', JSON.stringify({ insights }));
  h.data.set('@ai_session_two', JSON.stringify({ messages: ['all messages'] }));
  h.data.set('@flexchat_voice_intro_shown', 'true'); h.data.set('@user_id', 'secret-user'); h.data.set('@user_progress', 'earned');
  const exported = await h.exportData();
  assert.equal(exported.scope, 'local-device');
  assert.equal(exported.records['@ai_improved_memory_one'].insights.length, 123);
  assert.equal(exported.records['@ai_session_two'].messages[0], 'all messages');
  assert.equal(exported.records['@flexchat_voice_intro_shown'], true);
  assert.equal('@user_id' in exported.records, false); assert.equal('@user_progress' in exported.records, false);
});

test('storage removal failure is reported and retry remains available without reviving the old generation', async () => {
  const h = harness(); h.data.set('@ai_memory', 'private');
  const original = h.storage.multiRemove; h.storage.multiRemove = async () => {};
  const generation = h.lifecycle.getAIDataGeneration();
  await assert.rejects(h.erase(), /could not be removed/);
  assert.equal(h.lifecycle.isAIDataCurrent(generation), false);
  h.storage.multiRemove = original; await h.erase(); assert.equal(h.data.size, 0);
});

test('work is registered before its synchronous callback can trigger deletion', async () => {
  const h = harness(); const gate = deferred(); let removal; let finished = false;
  const write = h.lifecycle.trackAIWork(async () => {
    removal = h.lifecycle.deleteAIDataExclusively(async () => { finished = true; });
    await gate.promise;
  });
  await Promise.resolve(); await Promise.resolve(); assert.equal(finished, false);
  gate.resolve(); await write; await removal; assert.equal(finished, true);
});

test('pending native transcription drains before language removal and deletes its recording on completion', async () => {
  const data = new Map([['@user_id', 'one']]); const deleted = [];
  const gate = deferred(); const started = deferred();
  const load = createLoader({ mocks: {
    'src/services/ai/integrations/secureGoogleSpeechService': { transcribeAudio: async () => { started.resolve(); await gate.promise; return { text: 'hola', detectedLanguage: 'es-ES' }; } },
    'src/services/ai/utils/reliabilityService': { rateLimiter: { checkLimit: async () => ({ allowed: true }) } },
  }, externalMocks: {
    'expo-audio': { AudioModule: {}, setAudioModeAsync: async () => {} },
    'expo-file-system/legacy': { deleteAsync: async uri => { deleted.push(uri); } },
    '@react-native-async-storage/async-storage': { getItem: async key => data.get(key) ?? null, setItem: async (key, value) => { data.set(key, value); } },
  } });
  const voice = load('src/services/ai/integrations/voiceRecordingService.ts').default;
  const lifecycle = load('src/services/ai/aiDataLifecycle.ts'); const generation = lifecycle.getAIDataGeneration();
  const transcription = voice.transcribeAudio('file:///private.wav'); await started.promise;
  const removal = lifecycle.deleteAIDataExclusively(async () => { await voice.cancelRecording(); data.delete('@ai_wellness_detected_language'); });
  gate.resolve(); assert.equal(await transcription, 'hola'); await removal;
  assert.equal(lifecycle.isAIDataCurrent(generation), false);
  assert.equal(data.has('@ai_wellness_detected_language'), false);
  assert.ok(deleted.includes('file:///private.wav')); assert.equal(data.get('@user_id'), 'one');
});

test('deletion cancels a recorder which finishes preparing after deletion begins', async () => {
  const gate = deferred(); const started = deferred(); const deleted = []; let releases = 0;
  class Recorder {
    constructor() { this.uri = null; }
    async prepareToRecordAsync() { started.resolve(); await gate.promise; this.uri = 'file:///late.wav'; }
    record() {} async stop() {} release() { releases++; }
  }
  const load = createLoader({ globals: { setTimeout: callback => { callback(); return 1; } }, mocks: {
    'src/services/ai/integrations/secureGoogleSpeechService': {}, 'src/services/ai/utils/reliabilityService': {},
  }, externalMocks: {
    'expo-audio': { AudioModule: { requestRecordingPermissionsAsync: async () => ({ status: 'granted' }), AudioRecorder: Recorder }, setAudioModeAsync: async () => {} },
    'expo-file-system/legacy': { deleteAsync: async uri => { deleted.push(uri); } },
    '@react-native-async-storage/async-storage': {},
  } });
  const voice = load('src/services/ai/integrations/voiceRecordingService.ts').default;
  const lifecycle = load('src/services/ai/aiDataLifecycle.ts');
  const recording = voice.startRecording(); await started.promise;
  const removal = lifecycle.deleteAIDataExclusively(() => voice.cancelRecording(), () => voice.cancelRecording());
  gate.resolve(); await recording; await removal;
  assert.equal(voice.isRecording(), false); assert.ok(deleted.includes('file:///late.wav')); assert.ok(releases >= 1);
});

test('an in-flight AI notification schedule drains before cancellation and cannot leave a welcome flag or debounce cache', async () => {
  const gate = deferred(); const started = deferred(); const scheduled = new Set(); const data = new Map();
  const load = createLoader({ mocks: {
    'src/services/storageService': { getIsPremium: async () => false, KEYS: { AI_WELLNESS: { HAS_SEEN_WELCOME: '@ai_seen_welcome' } } },
    'src/utils/notificationManager': {
      NotificationType: { AI_WELLNESS: 'ai_wellness', UPGRADE_PROMPT: 'ai_upgrade' },
      cancelNotificationsByType: async () => { scheduled.clear(); },
      scheduleTypedNotification: async () => { started.resolve(); await gate.promise; scheduled.add('welcome'); return 'welcome'; },
    },
    'src/services/ai/scheduling/notificationMessages': {},
  }, externalMocks: {
    'expo-notifications': { SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval' } },
    '@react-native-async-storage/async-storage': { getItem: async key => data.get(key) ?? null, setItem: async (key, value) => { data.set(key, value); } },
  } });
  const scheduler = load('src/services/ai/scheduling/notificationScheduler.ts');
  const lifecycle = load('src/services/ai/aiDataLifecycle.ts');
  scheduler.markScheduled('previous');
  const pending = scheduler.scheduleAIWellnessV2('enable');
  const settled = pending.catch(error => error); await started.promise;
  const removal = lifecycle.deleteAIDataExclusively(async () => { data.clear(); await scheduler.cleanupAllAINotifications(); });
  gate.resolve(); await settled; await removal;
  assert.equal(scheduled.size, 0); assert.equal(data.size, 0);
  assert.equal(scheduler.canScheduleNotifications('previous'), true);
  assert.equal(scheduler.canScheduleNotifications('ai_wellness_enable'), true);
});

test('local AI metadata is included and removed without resetting unrelated rate limits or shared diagnostics', async () => {
  const h = harness();
  const aiKeys = ['@rate_limit_voice_transcription_one', '@rate_limit_ai_chat_free_one', '@rate_limit_ai_chat_premium_two', '@last_notification_processed'];
  for (const key of [...aiKeys, '@rate_limit_email_one', '@error_metrics']) h.data.set(key, 'metadata');
  const exported = await h.exportData();
  for (const key of aiKeys) assert.equal(exported.records[key], 'metadata');
  assert.match(exported.retainedMetadata, /Shared diagnostic error counts/);
  await h.erase();
  assert.deepEqual([...h.data.keys()].sort(), ['@error_metrics', '@rate_limit_email_one']);
});

test('UI work ignores only expected deletion cancellation and propagates real failures', async () => {
  const h = harness(); const gate = deferred();
  const deletion = h.lifecycle.deleteAIDataExclusively(() => gate.promise);
  let called = false;
  await h.lifecycle.runAIUIWork(async () => { called = true; });
  assert.equal(called, false); gate.resolve(); await deletion;
  await assert.rejects(h.lifecycle.runAIUIWork(async () => { throw new Error('disk failure'); }), /disk failure/);
});
